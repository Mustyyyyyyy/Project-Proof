import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
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

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Invalid session." } });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Your session has expired." } });
  }
}
