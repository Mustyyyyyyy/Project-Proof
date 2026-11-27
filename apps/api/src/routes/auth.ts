import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { isEmailConfigured, sendPasswordResetEmail, sendWelcomeEmail } from "../lib/email.js";

export const authRouter = Router();
const loginAttemptLimit = process.env.NODE_ENV === "production" ? 10 : 30;
const registrationLimit = process.env.NODE_ENV === "production" ? 5 : 20;
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: loginAttemptLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "LOGIN_RATE_LIMITED", message: "Too many sign-in attempts. Please wait a few minutes before trying again." } },
});
const registrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: registrationLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "REGISTRATION_RATE_LIMITED", message: "Too many registration attempts. Please wait a few minutes before trying again." } },
});
const credentialsSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
const registerSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(1).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
const GOOGLE_STATE_COOKIE = "googleOAuthState";
const GOOGLE_STATE_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  path: "/api/v1/auth/google",
  maxAge: 10 * 60 * 1000,
};

function getSecrets() {
  const access = process.env.JWT_ACCESS_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;
  if (!access || access.length < 32 || !refresh || refresh.length < 32) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters.");
  }
  return { access, refresh };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetCodeHash(userId: string, code: string) {
  const pepper = process.env.JWT_REFRESH_SECRET;
  if (!pepper) throw new Error("JWT_REFRESH_SECRET must be configured to issue password reset codes.");
  return createHash("sha256").update(`${pepper}:${userId}:${code}`).digest("hex");
}

async function sendWelcome(user: { email: string; profile: { fullName: string } | null }) {
  try {
    await sendWelcomeEmail(user.email, user.profile?.fullName ?? "there");
  } catch (error) {
    console.error("Could not send ProjectProof welcome email:", error);
  }
}

async function createSession(userId: string, res: Response) {
  const { access, refresh } = getSecrets();
  const accessToken = jwt.sign({}, access, { subject: userId, expiresIn: "15m" });
  const refreshToken = jwt.sign({ nonce: randomBytes(16).toString("hex") }, refresh, {
    subject: userId,
    expiresIn: "30d",
  });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: tokenHash(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  res.cookie("accessToken", accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return new OAuth2Client(clientId, clientSecret, callbackUrl);
}

function googleLoginRedirect(path = "/login", error?: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const target = new URL(path, frontendUrl);
  if (error) target.searchParams.set("error", error);
  return target.toString();
}

authRouter.get("/google", (req, res) => {
  try {
    const client = getGoogleOAuthClient();
    const state = randomBytes(32).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, GOOGLE_STATE_COOKIE_OPTIONS);
    res.redirect(client.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      res.redirect(googleLoginRedirect("/login", "google_not_configured"));
      return;
    }
    throw error;
  }
});

authRouter.get("/google/callback", async (req, res, next) => {
  const stateCookie = req.cookies?.[GOOGLE_STATE_COOKIE] as string | undefined;
  const stateQuery = typeof req.query.state === "string" ? req.query.state : "";
  res.clearCookie(GOOGLE_STATE_COOKIE, GOOGLE_STATE_COOKIE_OPTIONS);
  const cookieState = Buffer.from(stateCookie ?? "");
  const queryState = Buffer.from(stateQuery);
  if (!stateCookie || !/^[a-f0-9]{64}$/.test(stateCookie)
    || cookieState.length !== queryState.length
    || !timingSafeEqual(cookieState, queryState)) {
    res.redirect(googleLoginRedirect("/login", "google_invalid_state"));
    return;
  }
  if (typeof req.query.error === "string") {
    res.redirect(googleLoginRedirect("/login", "google_cancelled"));
    return;
  }
  if (typeof req.query.code !== "string") {
    res.redirect(googleLoginRedirect("/login", "google_auth_failed"));
    return;
  }

  try {
    const client = getGoogleOAuthClient();
    const { tokens } = await client.getToken(req.query.code);
    if (!tokens.id_token) throw new Error("Google did not return an identity token.");
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || identity.email_verified !== true) {
      res.redirect(googleLoginRedirect("/login", "google_email_unverified"));
      return;
    }

    const providerAccountId = identity.sub;
    const email = identity.email.toLowerCase();
    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId } },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
    if (existingAccount) {
      if (existingAccount.user.deletedAt) {
        res.redirect(googleLoginRedirect("/login", "account_unavailable"));
        return;
      }
      await createSession(existingAccount.userId, res);
      res.redirect(googleLoginRedirect("/dashboard"));
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.deletedAt) {
      res.redirect(googleLoginRedirect("/login", "account_unavailable"));
      return;
    }
    if (existingUser) {
      await prisma.$transaction([
        prisma.oAuthAccount.create({
          data: { provider: "google", providerAccountId, userId: existingUser.id },
        }),
        prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date() },
        }),
      ]);
      if (identity.picture) {
        await prisma.profile.updateMany({
          where: { userId: existingUser.id, avatarUrl: null },
          data: { avatarUrl: identity.picture },
        });
      }
      await createSession(existingUser.id, res);
      res.redirect(googleLoginRedirect("/dashboard"));
      return;
    }

    const emailName = (email.split("@")[0] ?? "member")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 20)
      .padEnd(3, "user");
    const username = `${emailName}_${randomBytes(4).toString("hex")}`.slice(0, 30);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        emailVerifiedAt: new Date(),
        oauthAccounts: { create: { provider: "google", providerAccountId } },
        profile: { create: {
          fullName: identity.name?.slice(0, 100) || emailName,
          avatarUrl: identity.picture,
        } },
      },
      select: { id: true },
    });
    await createSession(user.id, res);
    await sendWelcome({ email, profile: { fullName: identity.name?.slice(0, 100) || emailName } });
    res.redirect(googleLoginRedirect("/dashboard"));
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      res.redirect(googleLoginRedirect("/login", "google_not_configured"));
      return;
    }
    if (error instanceof Error && error.message.startsWith("JWT_")) {
      res.redirect(googleLoginRedirect("/login", "auth_not_configured"));
      return;
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      res.redirect(googleLoginRedirect("/login", "account_link_conflict"));
      return;
    }
    next(error);
  }
});

authRouter.post("/register", registrationRateLimit, async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid registration details." } });
    return;
  }

  try {
    getSecrets();
    const { email, password, fullName, username } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        profile: { create: { fullName } },
      },
      select: { id: true, email: true, username: true, profile: true },
    });
    await createSession(user.id, res);
    await sendWelcome(user);
    res.status(201).json({ data: { user } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("JWT_")) {
      res.status(503).json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured on this server." } });
      return;
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      res.status(409).json({ error: { code: "ACCOUNT_EXISTS", message: "That email or username is already in use." } });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", loginRateLimit, async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid login details." } });
    return;
  }
  try {
    getSecrets();
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, deletedAt: null },
      select: { id: true, email: true, username: true, passwordHash: true, profile: true },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      return;
    }
    await createSession(user.id, res);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ data: { user: safeUser } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("JWT_")) {
      res.status(503).json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured on this server." } });
      return;
    }
    next(error);
  }
});

const passwordResetRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many reset requests. Try again later." } },
});
const passwordResetConfirmLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many reset attempts. Try again later." } },
});

authRouter.post("/forgot-password", passwordResetRequestLimit, async (req, res, next) => {
  const parsed = z.object({ email: z.string().email().max(254).transform((value) => value.toLowerCase()) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter a valid email address." } });
    return;
  }
  if (!isEmailConfigured()) {
    res.status(503).json({ error: { code: "EMAIL_NOT_CONFIGURED", message: "Password reset email is not configured. Set RESEND_API_KEY and EMAIL_FROM on the API server." } });
    return;
  }
  try {
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, deletedAt: null },
      select: { id: true, email: true, profile: { select: { fullName: true } } },
    });
    if (!user) {
      res.status(202).json({ data: { message: "If an account exists for that email, a reset code will be sent." } });
      return;
    }

    await prisma.passwordResetCode.deleteMany({ where: { userId: user.id, consumedAt: null } });
    const code = String(randomInt(100_000, 1_000_000));
    const reset = await prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: resetCodeHash(user.id, code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    try {
      await sendPasswordResetEmail(user.email, user.profile?.fullName ?? "there", code);
    } catch (error) {
      await prisma.passwordResetCode.delete({ where: { id: reset.id } });
      console.error("Could not deliver password reset code:", error);
      res.status(503).json({ error: { code: "EMAIL_DELIVERY_FAILED", message: "The reset email could not be sent. Check the Resend sender configuration and try again." } });
      return;
    }
    res.status(202).json({ data: { message: "If an account exists for that email, a reset code will be sent." } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", passwordResetConfirmLimit, async (req, res, next) => {
  const parsed = z.object({
    email: z.string().email().max(254).transform((value) => value.toLowerCase()),
    code: z.string().regex(/^\d{6}$/),
    password: z.string().min(8).max(128),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Enter your email, six-digit code, and new password." } });
    return;
  }
  try {
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      res.status(400).json({ error: { code: "INVALID_RESET_CODE", message: "The reset code is invalid or expired." } });
      return;
    }
    const reset = await prisma.passwordResetCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!reset || reset.expiresAt <= new Date() || reset.attempts >= 5) {
      res.status(400).json({ error: { code: "INVALID_RESET_CODE", message: "The reset code is invalid or expired." } });
      return;
    }
    if (reset.codeHash !== resetCodeHash(user.id, parsed.data.code)) {
      await prisma.passwordResetCode.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      res.status(400).json({ error: { code: "INVALID_RESET_CODE", message: "The reset code is invalid or expired." } });
      return;
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetCode.update({ where: { id: reset.id }, data: { consumedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetCode.deleteMany({ where: { userId: user.id, consumedAt: null, id: { not: reset.id } } }),
    ]);
    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    res.json({ data: { message: "Your password has been updated. Sign in with your new password." } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const { access, refresh } = getSecrets();
    const payload = jwt.verify(token, refresh);
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error("Invalid refresh token.");
    const hash = tokenHash(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: { select: { deletedAt: true } } },
    });
    if (!stored || stored.expiresAt <= new Date() || stored.userId !== payload.sub || stored.user.deletedAt) {
      res.clearCookie("accessToken", COOKIE_OPTIONS);
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired." } });
      return;
    }
    const nextRefresh = jwt.sign({ nonce: randomBytes(16).toString("hex") }, refresh, {
      subject: stored.userId,
      expiresIn: "30d",
    });
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { tokenHash: hash } }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: tokenHash(nextRefresh),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    res.cookie("accessToken", jwt.sign({}, access, { subject: stored.userId, expiresIn: "15m" }), {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", nextRefresh, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ data: { refreshed: true } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("JWT_")) {
      res.status(503).json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured on this server." } });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.clearCookie("accessToken", COOKIE_OPTIONS);
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired." } });
      return;
    }
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) await prisma.refreshToken.deleteMany({ where: { tokenHash: tokenHash(token) } });
    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        profile: true,
        emailNotifications: true,
        _count: { select: { projects: true } },
      },
    });
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
      return;
    }
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});
