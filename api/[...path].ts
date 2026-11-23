import type { Request, Response } from "express";
import { app } from "../../api/src/app.js";

export default function handler(req: Request, res: Response) {
  const path = req.url ?? "/";
  if (path !== "/api" && path !== "/api/" && !path.startsWith("/api/")) {
    req.url = `/api${path.startsWith("/") ? path : `/${path}`}`;
  }
  return app(req, res);
}
