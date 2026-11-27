import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface AdminRequest extends AuthenticatedRequest {
  adminUserId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.accessToken;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!token || !secret) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Invalid session." } });
      return;
    }
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired." } });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "This account is unavailable." } });
      return;
    }
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
    return;
  }
  try {
    const admin = await prisma.user.findFirst({
      where: { id: req.userId, role: "ADMIN", deletedAt: null },
      select: { id: true },
    });
    if (!admin) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
      return;
    }
    req.adminUserId = admin.id;
    next();
  } catch (error) {
    next(error);
  }
}
