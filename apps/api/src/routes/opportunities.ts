import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const opportunitiesRouter = Router();

const opportunityTypes = [
  "FULL_TIME",
  "PART_TIME",
  "FREELANCE",
  "INTERNSHIP",
  "CONTRACT",
  "COLLABORATION",
  "VOLUNTEER",
  "SCHOLARSHIP",
  "PROJECT_BASED",
] as const;

opportunitiesRouter.get("/", async (req, res, next) => {
  const page = z.coerce.number().int().min(1).safeParse(req.query.page ?? 1);
  const pageSize = z.coerce.number().int().min(1).max(50).safeParse(req.query.pageSize ?? 20);
  const type = req.query.type === undefined ? undefined : z.enum(opportunityTypes).safeParse(req.query.type);
  const query = req.query.q === undefined ? undefined : z.string().trim().min(1).max(100).safeParse(req.query.q);
  if (!page.success || !pageSize.success || type?.success === false || query?.success === false) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid opportunity filters." } });
    return;
  }
  const filters: Prisma.OpportunityWhereInput[] = [
    { OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
  ];
  if (query?.success) {
    filters.push({
      OR: [
        { title: { contains: query.data, mode: "insensitive" as const } },
        { company: { contains: query.data, mode: "insensitive" as const } },
        { description: { contains: query.data, mode: "insensitive" as const } },
        { location: { contains: query.data, mode: "insensitive" as const } },
      ],
    });
  }
  const where: Prisma.OpportunityWhereInput = {
    ...(type?.success ? { type: type.data } : {}),
    AND: filters,
  };
  try {
    const [data, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page.data - 1) * pageSize.data,
        take: pageSize.data,
      }),
      prisma.opportunity.count({ where }),
    ]);
    res.json({
      data,
      pagination: { page: page.data, pageSize: pageSize.data, total, pages: Math.ceil(total / pageSize.data) },
    });
  } catch (error) {
    next(error);
  }
});
