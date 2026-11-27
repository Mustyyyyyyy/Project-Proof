import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { notifyUser } from "../lib/notifications.js";

export const projectsRouter = Router();

const projectInput = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(10).max(280),
  detailedDescription: z.string().max(20_000).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  projectType: z.string().trim().min(1).max(40).optional(),
  status: z.enum(["COMPLETED", "IN_PROGRESS", "CONCEPT", "ARCHIVED"]).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  location: z.string().trim().max(120).nullable().optional(),
  coverUrl: z.string().url().max(2048).nullable().optional(),
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
  const parsedSort = z.enum(["latest", "popular", "most-viewed"]).safeParse(req.query.sort ?? "latest");
  const parsedCategory = req.query.category === undefined
    ? undefined
    : z.string().regex(/^[a-z0-9-]{1,60}$/).safeParse(req.query.category);
  const parsedQuery = req.query.q === undefined
    ? undefined
    : z.string().trim().min(1).max(100).safeParse(req.query.q);
  if (!parsedPage.success || !parsedSize.success || !parsedSort.success
    || parsedCategory?.success === false || parsedQuery?.success === false) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project search, filter, sort, or pagination values." } });
    return;
  }
  try {
    const where = {
      visibility: "PUBLIC" as const,
      deletedAt: null,
      creator: { is: { deletedAt: null } },
      ...(parsedCategory?.success ? { category: { is: { slug: parsedCategory.data } } } : {}),
      ...(parsedQuery?.success ? {
        OR: [
          { title: { contains: parsedQuery.data, mode: "insensitive" as const } },
          { shortDescription: { contains: parsedQuery.data, mode: "insensitive" as const } },
          { detailedDescription: { contains: parsedQuery.data, mode: "insensitive" as const } },
          { category: { is: { name: { contains: parsedQuery.data, mode: "insensitive" as const } } } },
          { creator: { is: { username: { contains: parsedQuery.data, mode: "insensitive" as const } } } },
          { creator: { is: { profile: { is: { fullName: { contains: parsedQuery.data, mode: "insensitive" as const } } } } } },
        ],
      } : {}),
    };
    const orderBy = parsedSort.data === "popular"
      ? [{ likes: { _count: "desc" as const } }, { publishedAt: "desc" as const }, { createdAt: "desc" as const }]
      : parsedSort.data === "most-viewed"
        ? [{ viewCount: "desc" as const }, { publishedAt: "desc" as const }, { createdAt: "desc" as const }]
        : [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
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
    await notifyUser({
      userId: req.userId,
      type: data.visibility === "PUBLIC" ? "PROJECT_PUBLISHED" : "PROJECT_UPLOADED",
      title: data.visibility === "PUBLIC" ? "Your project is live" : "Project added to your portfolio",
      body: data.visibility === "PUBLIC"
        ? `"${data.title}" has been published to your portfolio.`
        : `"${data.title}" has been saved to your portfolio.`,
      href: data.visibility === "PUBLIC" ? `/projects/${data.slug}` : "/dashboard/projects",
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

projectsRouter.get("/mine/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  if (!parsedId.success || !req.userId) {
    res.status(parsedId.success ? 401 : 400).json({
      error: { code: parsedId.success ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: parsedId.success ? "Sign in to continue." : "Invalid project ID." },
    });
    return;
  }
  try {
    const project = await prisma.project.findFirst({
      where: { id: parsedId.data, creatorId: req.userId, deletedAt: null },
      include: { category: true },
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

projectsRouter.get("/bookmarks/mine", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: req.userId,
        project: {
          deletedAt: null,
          visibility: { in: ["PUBLIC", "UNLISTED"] },
          creator: { is: { deletedAt: null } },
        },
      },
      orderBy: { id: "desc" },
      include: {
        project: {
          include: {
            category: true,
            creator: { select: { username: true, profile: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });
    res.json({ data: bookmarks.map(({ project }) => project) });
  } catch (error) {
    next(error);
  }
});

projectsRouter.post("/:id/report", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsedId = z.string().uuid().safeParse(req.params.id);
  const parsedBody = z.object({
    reason: z.enum(["COPYRIGHT", "HARASSMENT", "MISLEADING", "INAPPROPRIATE", "OTHER"]),
    details: z.string().trim().max(2000).optional(),
  }).safeParse(req.body);
  if (!parsedId.success || !parsedBody.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to report a project." : "Choose a reason and provide valid report details." },
    });
    return;
  }
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: parsedId.data,
        deletedAt: null,
        visibility: { in: ["PUBLIC", "UNLISTED"] },
        creator: { is: { deletedAt: null } },
      },
      select: { id: true, creatorId: true },
    });
    if (!project) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    if (project.creatorId === req.userId) {
      res.status(409).json({ error: { code: "SELF_REPORT", message: "You cannot report your own project." } });
      return;
    }
    const existingReport = await prisma.report.findFirst({
      where: { reporterId: req.userId, projectId: project.id, status: "OPEN" },
      select: { id: true },
    });
    if (existingReport) {
      res.status(409).json({ error: { code: "REPORT_ALREADY_OPEN", message: "You already have an open report for this project." } });
      return;
    }
    const report = await prisma.report.create({
      data: {
        reporterId: req.userId,
        projectId: project.id,
        reason: parsedBody.data.reason,
        details: parsedBody.data.details || null,
      },
      select: { id: true, status: true, createdAt: true },
    });
    res.status(201).json({ data: report });
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
        creator: { is: { deletedAt: null } },
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
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to update a project." } });
    return;
  }
  const userId = req.userId;
  try {
    const existing = await prisma.project.findFirst({
      where: { id: parsedId.data, creatorId: userId, deletedAt: null },
      select: { visibility: true, title: true },
    });
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    const updateData = {
      ...parsed.data,
      ...(existing.visibility === "PRIVATE" && parsed.data.visibility === "PUBLIC" ? { publishedAt: new Date() } : {}),
    };
    const data = await prisma.project.update({
      where: { id: parsedId.data },
      data: updateData,
      include: { category: true, creator: { select: { username: true, profile: true } } },
    });
    if (existing.visibility !== "PUBLIC" && data.visibility === "PUBLIC") {
      await notifyUser({
        userId,
        type: "PROJECT_PUBLISHED",
        title: "Your project is live",
        body: `"${data.title}" has been published to your portfolio.`,
        href: `/projects/${data.slug}`,
      });
    }
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
      where: {
        id: parsedId.data,
        deletedAt: null,
        visibility: { in: ["PUBLIC", "UNLISTED"] },
        creator: { is: { deletedAt: null } },
      },
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
      where: {
        id: parsedId.data,
        deletedAt: null,
        visibility: { in: ["PUBLIC", "UNLISTED"] },
        creator: { is: { deletedAt: null } },
      },
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
