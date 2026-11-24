import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { projects: { where: { visibility: "PUBLIC", deletedAt: null } } },
        },
      },
    });
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});
