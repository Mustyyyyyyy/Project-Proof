import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }).safeParse(req.query);
  if (!parsed.success || !req.userId) {
    res.status(parsed.success ? 401 : 400).json({
      error: { code: parsed.success ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: parsed.success ? "Sign in to continue." : "Invalid notification list parameters." },
    });
    return;
  }
  try {
    const where = { userId: req.userId };
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.userId, read: false } }),
    ]);
    res.json({
      data,
      pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total, pages: Math.ceil(total / parsed.data.pageSize) },
      unread,
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req: AuthenticatedRequest, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ data: { read: true } });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", async (req: AuthenticatedRequest, res, next) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to continue." : "Invalid notification ID." },
    });
    return;
  }
  try {
    const result = await prisma.notification.updateMany({
      where: { id: id.data, userId: req.userId },
      data: { read: true },
    });
    if (!result.count) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found." } });
      return;
    }
    res.json({ data: { read: true } });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/preferences", async (req: AuthenticatedRequest, res, next) => {
  const parsed = z.object({ emailNotifications: z.boolean() }).safeParse(req.body);
  if (!parsed.success || !req.userId) {
    res.status(!req.userId ? 401 : 400).json({
      error: { code: !req.userId ? "UNAUTHENTICATED" : "VALIDATION_ERROR", message: !req.userId ? "Sign in to continue." : "Choose whether to receive notification emails." },
    });
    return;
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { emailNotifications: parsed.data.emailNotifications },
      select: { emailNotifications: true },
    });
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});
