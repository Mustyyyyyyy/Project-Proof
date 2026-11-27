import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, type AdminRequest } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const pageParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
});

const opportunityTypes = [
  "FULL_TIME", "PART_TIME", "FREELANCE", "INTERNSHIP", "CONTRACT",
  "COLLABORATION", "VOLUNTEER", "SCHOLARSHIP", "PROJECT_BASED",
] as const;

const opportunityInput = z.object({
  title: z.string().trim().min(3).max(160),
  company: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(10_000),
  type: z.enum(opportunityTypes),
  location: z.string().trim().max(120).nullable().optional(),
  remote: z.boolean().optional(),
  compensation: z.string().trim().max(160).nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});

adminRouter.get("/overview", async (_req, res, next) => {
  try {
    const [users, activeUsers, projects, publicProjects, deletedProjects, openReports, opportunities, categories, newestUsers, latestReports] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null, visibility: "PUBLIC" } }),
      prisma.project.count({ where: { deletedAt: { not: null } } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.opportunity.count(),
      prisma.category.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, username: true, email: true, role: true, createdAt: true, deletedAt: true, profile: { select: { fullName: true } } },
      }),
      prisma.report.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { reporter: { select: { username: true } }, project: { select: { id: true, title: true, slug: true } } },
      }),
    ]);
    res.json({
      data: {
        totals: { users, activeUsers, projects, publicProjects, deletedProjects, openReports, opportunities, categories },
        newestUsers,
        latestReports,
      },
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users", async (req, res, next) => {
  const parsed = pageParams.extend({
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid user list filters." } });
    return;
  }
  const { page, pageSize, q, role, status } = parsed.data;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status === "ACTIVE" ? { deletedAt: null } : status === "SUSPENDED" ? { deletedAt: { not: null } } : {}),
    ...(q ? { OR: [
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
      { profile: { is: { fullName: { contains: q, mode: "insensitive" } } } },
    ] } : {}),
  };
  try {
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, username: true, role: true, createdAt: true, deletedAt: true,
          profile: { select: { fullName: true, avatarUrl: true } },
          _count: { select: { projects: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/:id", async (req: AdminRequest, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = z.object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  }).refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid user ID and role or status." } });
    return;
  }
  if (id.data === req.adminUserId) {
    res.status(409).json({ error: { code: "SELF_MODIFICATION", message: "You cannot change your own administrator role or account status." } });
    return;
  }
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({ where: { id: id.data }, select: { id: true, role: true, deletedAt: true } });
      if (!current) return null;
      const removesActiveAdmin = current.role === "ADMIN" && current.deletedAt === null
        && (body.data.role === "USER" || body.data.status === "SUSPENDED");
      if (removesActiveAdmin) {
        const adminCount = await transaction.user.count({ where: { role: "ADMIN", deletedAt: null } });
        if (adminCount <= 1) throw new Error("LAST_ADMIN");
      }
      return transaction.user.update({
        where: { id: current.id },
        data: {
          ...(body.data.role ? { role: body.data.role } : {}),
          ...(body.data.status ? { deletedAt: body.data.status === "SUSPENDED" ? new Date() : null } : {}),
        },
        select: { id: true, email: true, username: true, role: true, deletedAt: true },
      });
    });
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }
    res.json({ data: user });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ADMIN") {
      res.status(409).json({ error: { code: "LAST_ADMIN", message: "At least one active administrator must remain." } });
      return;
    }
    next(error);
  }
});

adminRouter.get("/projects", async (req, res, next) => {
  const parsed = pageParams.extend({
    includeDeleted: z.enum(["true", "false"]).default("false"),
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project list filters." } });
    return;
  }
  const { page, pageSize, q, visibility, includeDeleted } = parsed.data;
  const where: Prisma.ProjectWhereInput = {
    ...(includeDeleted === "false" ? { deletedAt: null } : {}),
    ...(visibility ? { visibility } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { creator: { username: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  try {
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          creator: { select: { id: true, username: true, email: true } },
          _count: { select: { reports: { where: { status: "OPEN" } } } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    res.json({ data, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/projects/:id", async (req, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = z.object({
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
    deleted: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid project ID and moderation change." } });
    return;
  }
  try {
    const result = await prisma.project.updateMany({
      where: { id: id.data },
      data: {
        ...(body.data.visibility ? { visibility: body.data.visibility } : {}),
        ...(body.data.deleted !== undefined ? { deletedAt: body.data.deleted ? new Date() : null } : {}),
      },
    });
    if (!result.count) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found." } });
      return;
    }
    const data = await prisma.project.findUnique({
      where: { id: id.data },
      select: { id: true, title: true, slug: true, visibility: true, deletedAt: true },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/reports", async (req, res, next) => {
  const parsed = pageParams.extend({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).optional() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid report list filters." } });
    return;
  }
  const { page, pageSize, status } = parsed.data;
  const where = status ? { status } : {};
  try {
    const [data, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, username: true, email: true } },
          project: { select: { id: true, title: true, slug: true, visibility: true, deletedAt: true, creator: { select: { username: true } } } },
        },
      }),
      prisma.report.count({ where }),
    ]);
    res.json({ data, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/reports/:id", async (req, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const body = z.object({
    status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
    adminNote: z.string().trim().max(2000).nullable().optional(),
    removeProject: z.boolean().default(false),
  }).safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid report ID and decision." } });
    return;
  }
  try {
    const report = await prisma.report.findUnique({ where: { id: id.data }, select: { id: true, projectId: true } });
    if (!report) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Report not found." } });
      return;
    }
    const result = await prisma.$transaction(async (transaction) => {
      if (body.data.removeProject) {
        await transaction.project.updateMany({
          where: { id: report.projectId },
          data: { deletedAt: new Date(), visibility: "PRIVATE" },
        });
      }
      return transaction.report.update({
        where: { id: id.data },
        data: {
          status: body.data.status,
          adminNote: body.data.adminNote,
          resolvedAt: body.data.status === "OPEN" ? null : new Date(),
        },
      });
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/opportunities", async (_req, res, next) => {
  try {
    const data = await prisma.opportunity.findMany({ orderBy: { publishedAt: "desc" } });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/opportunities", async (req, res, next) => {
  const parsed = opportunityInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid opportunity details." } });
    return;
  }
  try {
    const data = await prisma.opportunity.create({
      data: { ...parsed.data, deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null },
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/opportunities/:id", async (req, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const parsed = opportunityInput.partial().safeParse(req.body);
  if (!id.success || !parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid opportunity ID and at least one valid field." } });
    return;
  }
  try {
    const data = await prisma.opportunity.update({
      where: { id: id.data },
      data: {
        ...parsed.data,
        ...(parsed.data.deadline !== undefined ? { deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null } : {}),
      },
    });
    res.json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Opportunity not found." } });
      return;
    }
    next(error);
  }
});

adminRouter.delete("/opportunities/:id", async (req, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid opportunity ID." } });
    return;
  }
  try {
    await prisma.opportunity.delete({ where: { id: id.data } });
    res.status(204).end();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Opportunity not found." } });
      return;
    }
    next(error);
  }
});

adminRouter.get("/categories", async (_req, res, next) => {
  try {
    const data = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/categories", async (req, res, next) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid category." } });
    return;
  }
  try {
    const data = await prisma.category.create({ data: parsed.data });
    res.status(201).json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: { code: "CATEGORY_EXISTS", message: "That category name or URL is already in use." } });
      return;
    }
    next(error);
  }
});

adminRouter.delete("/categories/:id", async (req, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid category ID." } });
    return;
  }
  try {
    await prisma.category.delete({ where: { id: id.data } });
    res.status(204).end();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Category not found." } });
      return;
    }
    next(error);
  }
});
