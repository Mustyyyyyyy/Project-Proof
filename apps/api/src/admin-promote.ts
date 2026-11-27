import "dotenv/config";
import { prisma } from "./lib/prisma.js";

async function promoteUser() {
  const emailArg = process.argv.find((argument) => argument.startsWith("--email="));
  const email = emailArg?.slice("--email=".length).trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Usage: npm run admin:promote -w apps/api -- --email=admin@example.com");
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, username: true, deletedAt: true } });
  if (!user || user.deletedAt) {
    throw new Error("An active account with that exact email must exist before it can be promoted.");
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`Administrator role assigned to ${user.email} (@${user.username}).`);
}

promoteUser()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Could not promote the account.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
