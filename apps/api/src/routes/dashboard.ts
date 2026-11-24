import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/overview", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }

  try {
    const userId = req.userId;
    const [totalProjects, publicProjects, drafts, savedProjects, likesReceived, recentProjects] = await Promise.all([
      prisma.project.count({ where: { creatorId: userId, deletedAt: null } }),
      prisma.project.count({ where: { creatorId: userId, visibility: "PUBLIC", deletedAt: null } }),
      prisma.project.count({ where: { creatorId: userId, visibility: "PRIVATE", deletedAt: null } }),
      prisma.bookmark.count({ where: { userId, project: { deletedAt: null, visibility: { in: ["PUBLIC", "UNLISTED"] } } } }),
      prisma.projectLike.count({ where: { project: { creatorId: userId, deletedAt: null } } }),
      prisma.project.findMany({
        where: { creatorId: userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { category: true, _count: { select: { likes: true } } },
      }),
    ]);

    res.json({
      data: {
        totals: { totalProjects, publicProjects, drafts, savedProjects, likesReceived },
        recentProjects,
      },
    });
  } catch (error) {
    next(error);
  }
});
