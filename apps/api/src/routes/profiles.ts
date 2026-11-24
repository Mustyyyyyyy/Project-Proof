import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const profilesRouter = Router();

const profileInput = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  professionalTitle: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  coverUrl: z.string().url().max(2048).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  availability: z.string().trim().max(80).nullable().optional(),
  website: z.string().url().max(2048).nullable().optional(),
  publicEmail: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one profile field.");

profilesRouter.get("/", async (req, res, next) => {
  const parsedLimit = z.coerce.number().int().min(1).max(24).safeParse(req.query.limit ?? 8);
  const parsedQuery = req.query.q === undefined
    ? undefined
    : z.string().trim().min(1).max(100).safeParse(req.query.q);
  if (!parsedLimit.success || parsedQuery?.success === false) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid profile result limit." } });
    return;
  }
  try {
    const profiles = await prisma.profile.findMany({
      where: {
        user: { deletedAt: null },
        ...(parsedQuery?.success ? {
          OR: [
            { fullName: { contains: parsedQuery.data, mode: "insensitive" } },
            { professionalTitle: { contains: parsedQuery.data, mode: "insensitive" } },
            { bio: { contains: parsedQuery.data, mode: "insensitive" } },
            { location: { contains: parsedQuery.data, mode: "insensitive" } },
            { country: { contains: parsedQuery.data, mode: "insensitive" } },
            { user: { username: { contains: parsedQuery.data, mode: "insensitive" } } },
          ],
        } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: parsedLimit.data,
      include: {
        user: {
          select: {
            username: true,
            _count: { select: { projects: { where: { visibility: "PUBLIC", deletedAt: null } } } },
          },
        },
      },
    });
    res.json({
      data: profiles.map(({ user, ...profile }) => ({
        ...profile,
        username: user.username,
        projectCount: user._count.projects,
      })),
    });
  } catch (error) {
    next(error);
  }
});

profilesRouter.get("/:username", async (req, res, next) => {
  const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/).safeParse(req.params.username);
  if (!username.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid username." } });
    return;
  }
  try {
    const profile = await prisma.profile.findFirst({
      where: { user: { username: username.data, deletedAt: null } },
      include: {
        user: { select: { username: true, email: true } },
      },
    });
    if (!profile) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Profile not found." } });
      return;
    }
    const projects = await prisma.project.findMany({
      where: { creatorId: profile.userId, visibility: "PUBLIC", deletedAt: null },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: {
        category: true,
        _count: { select: { likes: true } },
      },
    });
    const { user, ...profileData } = profile;
    res.json({
      data: {
        ...profileData,
        username: user.username,
        ...(profile.publicEmail ? { email: user.email } : {}),
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
});

profilesRouter.patch("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsed = profileInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid profile details." } });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const updated = await prisma.profile.updateMany({
      where: { userId: req.userId },
      data: parsed.data,
    });
    if (!updated.count) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Profile not found." } });
      return;
    }
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    res.json({ data: profile });
  } catch (error) {
    next(error);
  }
});
