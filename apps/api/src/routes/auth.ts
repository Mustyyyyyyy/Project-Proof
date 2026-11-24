import { createHash, randomBytes } from "node:crypto";
import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const authRouter = Router();
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

authRouter.post("/register", async (req, res, next) => {
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

authRouter.post("/login", async (req, res, next) => {
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
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.expiresAt <= new Date() || stored.userId !== payload.sub) {
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
