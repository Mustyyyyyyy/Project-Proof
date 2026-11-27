"use client";

import { useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  params: {
    allowed_formats: string;
    folder: string;
    overwrite: boolean;
    public_id: string;
    timestamp: number;
  };
  signature: string;
}

export function CloudinaryImageField({
  label,
  name,
  purpose,
  value,
  onChange,
  maxLength = 2048,
}: {
  label: string;
  name?: string;
  purpose: "profile" | "project";
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const signatureResponse = await fetch(`${API_URL}/api/v1/uploads/signature`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const signatureBody = await signatureResponse.json();
      if (signatureResponse.status === 401) throw new Error("Sign in again before uploading an image.");
      if (!signatureResponse.ok) throw new Error(signatureBody.error?.message || "A secure upload could not be started.");
      const signed = signatureBody.data as UploadSignature;

      const formData = new FormData();
      for (const [key, value] of Object.entries(signed.params)) formData.set(key, String(value));
      formData.set("api_key", signed.apiKey);
      formData.set("signature", signed.signature);
      formData.set("file", file);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadBody = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadBody.error?.message || "Cloudinary could not store this image.");
      }
      if (typeof uploadBody.secure_url !== "string" || !uploadBody.secure_url.startsWith("https://res.cloudinary.com/")) {
        throw new Error("Cloudinary returned an invalid image URL.");
      }
      onChange(uploadBody.secure_url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold">
        {label}
        <input
          name={name}
          type="url"
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border px-3 font-normal"
          placeholder="https://"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => void upload(event.currentTarget.files?.[0])}
          className="sr-only"
          aria-label={`Upload ${label.toLowerCase()}`}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
        <span className="text-xs text-neutral-500">JPG, PNG, WebP, or AVIF · up to 5 MB</span>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
