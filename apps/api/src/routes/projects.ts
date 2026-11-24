import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const projectsRouter = Router();

const projectInput = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(10).max(280),
  detailedDescription: z.string().max(20_000).optional(),
  categoryId: z.string().uuid().optional(),
  projectType: z.string().trim().min(1).max(40).optional(),
  status: z.enum(["COMPLETED", "IN_PROGRESS", "CONCEPT", "ARCHIVED"]).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  location: z.string().trim().max(120).optional(),
  coverUrl: z.string().url().max(2048).optional(),
});

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return slug || "project";
}

projectsRouter.get("/", async (req, res, next) => {
  const parsedPage = z.coerce.number().int().min(1).safeParse(req.query.page ?? 1);
  const parsedSize = z.coerce.number().int().min(1).max(50).safeParse(req.query.pageSize ?? 20);
  const parsedCategory = req.query.category === undefined
    ? undefined
    : z.string().regex(/^[a-z0-9-]{1,60}$/).safeParse(req.query.category);
  if (!parsedPage.success || !parsedSize.success || parsedCategory?.success === false) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid pagination values." } });
    return;
  }
  try {
    const where = {
      visibility: "PUBLIC" as const,
      deletedAt: null,
      ...(parsedCategory?.success ? { category: { is: { slug: parsedCategory.data } } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (parsedPage.data - 1) * parsedSize.data,
        take: parsedSize.data,
        include: {
          category: true,
          creator: { select: { username: true, profile: true } },
          _count: { select: { likes: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    res.json({
      data,
      pagination: { page: parsedPage.data, pageSize: parsedSize.data, total, pages: Math.ceil(total / parsedSize.data) },
    });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsed = projectInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid project details." } });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const baseSlug = slugify(parsed.data.title);
    const data = await prisma.project.create({
      data: {
        ...parsed.data,
        creatorId: req.userId,
        slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`,
        publishedAt: parsed.data.visibility === "PRIVATE" ? null : new Date(),
      },
      include: { category: true, creator: { select: { username: true, profile: true } } },
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/mine", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const data = await prisma.project.findMany({
      where: { creatorId: req.userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { category: true, _count: { select: { likes: true } } },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

projectsRouter.get("/:slug", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        slug: req.params.slug,
        deletedAt: null,
        visibility: { in: ["PUBLIC", "UNLISTED"] },
      },
      include: {
        category: true,
        skills: { include: { skill: true } },
        creator: { select: { username: true, profile: true } },
        _count: { select: { likes: true } },
      },
    });
    if (!project) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

projectsRouter.put("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  const parsed = projectInput.partial().safeParse(req.body);
  if (!parsedId.success || !parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid project ID and at least one valid field." } });
    return;
  }
  try {
    const result = await prisma.project.updateMany({
      where: { id: parsedId.data, creatorId: req.userId, deletedAt: null },
      data: parsed.data,
    });
    if (!result.count) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    const data = await prisma.project.findUnique({
      where: { id: parsedId.data },
      include: { category: true, creator: { select: { username: true, profile: true } } },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

projectsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project ID." } });
    return;
  }
  try {
    const result = await prisma.project.updateMany({
      where: { id: parsedId.data, creatorId: req.userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/:id/like", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success || !req.userId) {
    res.status(parsedId.success ? 401 : 400).json({
      error: { code: parsedId.success ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: parsedId.success ? "Sign in to continue." : "Invalid project ID." },
    });
    return;
  }
  const userId = req.userId;
  try {
    const project = await prisma.project.findFirst({
      where: { id: parsedId.data, deletedAt: null, visibility: { in: ["PUBLIC", "UNLISTED"] } },
      select: { id: true },
    });
    if (!project) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.projectLike.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
      });
      if (existing) {
        await transaction.projectLike.delete({ where: { id: existing.id } });
      } else {
        await transaction.projectLike.create({ data: { projectId: project.id, userId } });
      }
      const count = await transaction.projectLike.count({ where: { projectId: project.id } });
      return { liked: !existing, count };
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/:id/bookmark", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success || !req.userId) {
    res.status(parsedId.success ? 401 : 400).json({
      error: { code: parsedId.success ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: parsedId.success ? "Sign in to continue." : "Invalid project ID." },
    });
    return;
  }
  const userId = req.userId;
  try {
    const project = await prisma.project.findFirst({
      where: { id: parsedId.data, deletedAt: null, visibility: { in: ["PUBLIC", "UNLISTED"] } },
      select: { id: true },
    });
    if (!project) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.bookmark.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
      });
      if (existing) {
        await transaction.bookmark.delete({ where: { id: existing.id } });
      } else {
        await transaction.bookmark.create({ data: { projectId: project.id, userId } });
      }
      return { bookmarked: !existing };
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
