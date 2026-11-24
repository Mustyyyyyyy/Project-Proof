import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const searchRouter = Router();

searchRouter.get("/", async (req, res, next) => {
  const parsedQuery = z.string().trim().min(1).max(100).safeParse(req.query.q);
  const parsedLimit = z.coerce.number().int().min(1).max(20).safeParse(req.query.limit ?? 10);
  if (!parsedQuery.success || !parsedLimit.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a search query of 1–100 characters." } });
    return;
  }
  const query = parsedQuery.data;
  const take = parsedLimit.data;
  try {
    const [rankedProjectRows, matchedProjects, professionals, categories, skills] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id"
        FROM "Project" p
        WHERE p."visibility" = 'PUBLIC'::"Visibility"
          AND p."deletedAt" IS NULL
          AND to_tsvector(
            'simple',
            coalesce(p."title", '') || ' ' ||
            coalesce(p."shortDescription", '') || ' ' ||
            coalesce(p."detailedDescription", '')
          ) @@ websearch_to_tsquery('simple', ${query})
        ORDER BY ts_rank(
          to_tsvector(
            'simple',
            coalesce(p."title", '') || ' ' ||
            coalesce(p."shortDescription", '') || ' ' ||
            coalesce(p."detailedDescription", '')
          ),
          websearch_to_tsquery('simple', ${query})
        ) DESC, p."publishedAt" DESC NULLS LAST
        LIMIT ${take}
      `,
      prisma.project.findMany({
        where: {
          visibility: "PUBLIC",
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { shortDescription: { contains: query, mode: "insensitive" } },
            { detailedDescription: { contains: query, mode: "insensitive" } },
            { creator: { username: { contains: query, mode: "insensitive" } } },
            { creator: { profile: { professionalTitle: { contains: query, mode: "insensitive" } } } },
            { skills: { some: { skill: { name: { contains: query, mode: "insensitive" } } } } },
          ],
        },
        take,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          category: true,
          creator: { select: { username: true, profile: true } },
          _count: { select: { likes: true } },
        },
      }),
      prisma.profile.findMany({
        where: {
          user: { deletedAt: null },
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { professionalTitle: { contains: query, mode: "insensitive" } },
            { bio: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
            { country: { contains: query, mode: "insensitive" } },
            { user: { username: { contains: query, mode: "insensitive" } } },
          ],
        },
        take,
        include: { user: { select: { username: true } } },
      }),
      prisma.category.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take,
      }),
      prisma.skill.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take,
      }),
    ]);
    const rankedProjects = rankedProjectRows.length
      ? await prisma.project.findMany({
          where: { id: { in: rankedProjectRows.map((row) => row.id) } },
          include: {
            category: true,
            creator: { select: { username: true, profile: true } },
            _count: { select: { likes: true } },
          },
        })
      : [];
    const byId = new Map([...rankedProjects, ...matchedProjects].map((project) => [project.id, project]));
    const orderedProjects = [
      ...rankedProjectRows.map((row) => byId.get(row.id)),
      ...matchedProjects.map((project) => byId.get(project.id)),
    ].filter((project, index, list) => project && list.findIndex((candidate) => candidate?.id === project.id) === index);
    res.json({ data: { projects: orderedProjects.slice(0, take), professionals, categories, skills }, query });
  } catch (error) {
    next(error);
  }
});
