import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const people = [
  {
    email: "ada@example.com",
    username: "ada-okafor",
    fullName: "Ada Okafor",
    title: "Product Designer",
    country: "Nigeria",
    location: "Lagos",
  },
  {
    email: "daniel@example.com",
    username: "daniel-kim",
    fullName: "Daniel Kim",
    title: "Frontend Engineer",
    country: "South Korea",
    location: "Seoul",
  },
  {
    email: "maya@example.com",
    username: "maya-chen",
    fullName: "Maya Chen",
    title: "Architect",
    country: "Singapore",
    location: "Singapore",
  },
];

const categoryData = [
  { name: "Product Design", slug: "product-design" },
  { name: "Software Development", slug: "software-development" },
  { name: "Architecture", slug: "architecture" },
];

const projectData = [
  {
    slug: "northline-commerce",
    title: "Northline Commerce",
    shortDescription: "A clearer, more accessible purchasing experience for independent retailers.",
    detailedDescription:
      "Research-led commerce redesign covering product discovery, catalog management, and a streamlined checkout.",
    username: "ada-okafor",
    categorySlug: "product-design",
    coverUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85",
    skills: ["Figma", "UX Research", "Prototyping"],
  },
  {
    slug: "civic-mobility-dashboard",
    title: "Civic mobility dashboard",
    shortDescription: "A responsive dashboard that makes transit reliability easier to understand.",
    detailedDescription:
      "An open civic data project combining route-level reliability insights with accessible map and chart views.",
    username: "daniel-kim",
    categorySlug: "software-development",
    coverUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
    skills: ["React", "TypeScript", "Data Visualization"],
  },
  {
    slug: "quiet-geometry",
    title: "The Quiet Geometry",
    shortDescription: "A compact community studio shaped around daylight and shared space.",
    detailedDescription:
      "A small-footprint architecture concept using passive daylight, durable materials, and flexible communal space.",
    username: "maya-chen",
    categorySlug: "architecture",
    coverUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=85",
    skills: ["Architecture", "BIM", "Sustainable Design"],
  },
];

const opportunityData = [
  {
    title: "Product designer, merchant tools",
    company: "Northline Studio",
    description: "Design a practical catalog and checkout experience with a small product team. Share relevant case studies with your application.",
    type: "FULL_TIME" as const,
    location: "Remote",
    remote: true,
    compensation: "USD 90,000–125,000",
  },
  {
    title: "Frontend engineering internship",
    company: "Civic Systems",
    description: "Help build accessible public-transit data tools with React and TypeScript alongside experienced engineers.",
    type: "INTERNSHIP" as const,
    location: "Seoul, South Korea",
    remote: false,
    compensation: "Paid internship",
  },
  {
    title: "Community studio concept architect",
    company: "Form & Field",
    description: "Develop a climate-conscious concept package for a compact neighborhood arts and learning studio.",
    type: "CONTRACT" as const,
    location: "Singapore",
    remote: true,
    compensation: "Project-based",
  },
];

async function seed() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set SEED_DEMO_PASSWORD to a password of at least 12 characters before seeding.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const users = new Map<string, string>();

  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        email: person.email,
        username: person.username,
        passwordHash,
        profile: {
          create: {
            fullName: person.fullName,
            professionalTitle: person.title,
            country: person.country,
            location: person.location,
            bio: `Independent ${person.title.toLowerCase()} sharing thoughtful, carefully documented work.`,
          },
        },
      },
    });
    users.set(person.username, user.id);
  }

  const categories = new Map<string, string>();
  for (const category of categoryData) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categories.set(category.slug, record.id);
  }

  const skills = new Map<string, string>();
  for (const name of new Set(projectData.flatMap((project) => project.skills))) {
    const skill = await prisma.skill.upsert({
      where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      update: { name },
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    });
    skills.set(name, skill.id);
  }

  for (const project of projectData) {
    const creatorId = users.get(project.username);
    const categoryId = categories.get(project.categorySlug);
    if (!creatorId || !categoryId) throw new Error(`Missing seed relation for ${project.slug}`);
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {
        title: project.title,
        shortDescription: project.shortDescription,
        detailedDescription: project.detailedDescription,
        coverUrl: project.coverUrl,
        categoryId,
        visibility: "PUBLIC",
      },
      create: {
        slug: project.slug,
        title: project.title,
        shortDescription: project.shortDescription,
        detailedDescription: project.detailedDescription,
        creatorId,
        categoryId,
        coverUrl: project.coverUrl,
        visibility: "PUBLIC",
        publishedAt: new Date(),
        skills: {
          create: project.skills.map((skillName) => {
            const skillId = skills.get(skillName);
            if (!skillId) throw new Error(`Missing seed skill ${skillName}`);
            return { skillId };
          }),
        },
      },
    });
  }

  for (const opportunity of opportunityData) {
    const existing = await prisma.opportunity.findFirst({
      where: { title: opportunity.title, company: opportunity.company },
    });
    if (!existing) await prisma.opportunity.create({ data: opportunity });
  }

  console.log(`Seeded ${people.length} professionals, ${projectData.length} projects, ${skills.size} skills, and ${opportunityData.length} opportunities.`);
}

seed()
  .catch((error: unknown) => {
    console.error("ProjectProof database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
