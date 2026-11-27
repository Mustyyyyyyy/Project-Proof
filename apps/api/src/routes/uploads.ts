import { randomUUID } from "node:crypto";
import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const uploadsRouter = Router();

uploadsRouter.post("/signature", requireAuth, (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ purpose: z.enum(["profile", "project"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Choose a valid image upload purpose." } });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in to upload images." } });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({
      error: { code: "UPLOADS_NOT_CONFIGURED", message: "Image uploads are not configured. Set the Cloudinary credentials on the API server." },
    });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    allowed_formats: "jpg,jpeg,png,webp,avif",
    folder: `projectproof/${req.userId}/${parsed.data.purpose}`,
    overwrite: false,
    public_id: randomUUID(),
    timestamp,
  };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  res.json({ data: { cloudName, apiKey, params, signature } });
});
