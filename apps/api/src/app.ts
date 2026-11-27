import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { categoriesRouter } from "./routes/categories.js";
import { opportunitiesRouter } from "./routes/opportunities.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { profilesRouter } from "./routes/profiles.js";
import { searchRouter } from "./routes/search.js";
import { uploadsRouter } from "./routes/uploads.js";
import { adminRouter } from "./routes/admin.js";
import { notificationsRouter } from "./routes/notifications.js";
import { contactRequestsRouter } from "./routes/contact-requests.js";
import { messagesRouter } from "./routes/messages.js";

export const app = express();
app.set("trust proxy", process.env.VERCEL ? 1 : false);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "projectproof-api" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectsRouter);
app.use("/api/v1/profiles", profilesRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/opportunities", opportunitiesRouter);
app.use("/api/v1/uploads", uploadsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/contact-requests", contactRequestsRouter);
app.use("/api/v1/messages", messagesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (
    err instanceof Prisma.PrismaClientInitializationError
    || (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P1001")
  ) {
    res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The database is unavailable. Configure DATABASE_URL and verify the database connection.",
      },
    });
    return;
  }
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});
