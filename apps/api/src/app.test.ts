import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("ProjectProof API", () => {
  it("reports healthy", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("rejects invalid project pagination before querying storage", async () => {
    const response = await request(app).get("/api/v1/projects?page=0");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("validates registration before accessing storage", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires a search term", async () => {
    const response = await request(app).get("/api/v1/search");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects malformed category filters before querying storage", async () => {
    const response = await request(app).get("/api/v1/projects?category=Bad%20Category");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported project sorting before querying storage", async () => {
    const response = await request(app).get("/api/v1/projects?sort=oldest");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects oversized project search terms before querying storage", async () => {
    const response = await request(app).get(`/api/v1/projects?q=${"a".repeat(101)}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication for session lookup", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects unknown opportunity types before querying storage", async () => {
    const response = await request(app).get("/api/v1/opportunities?type=UNKNOWN");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication to update a profile", async () => {
    const response = await request(app).patch("/api/v1/profiles/me").send({ fullName: "Ada" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("validates malformed public profile usernames", async () => {
    const response = await request(app).get("/api/v1/profiles/not-valid!");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication for administrator endpoints", async () => {
    const response = await request(app).get("/api/v1/admin/overview");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires authentication before issuing Cloudinary upload signatures", async () => {
    const response = await request(app)
      .post("/api/v1/uploads/signature")
      .send({ purpose: "profile" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires authentication to report projects", async () => {
    const response = await request(app)
      .post("/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/report")
      .send({ reason: "COPYRIGHT" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires authentication for creator contact requests", async () => {
    const response = await request(app)
      .post("/api/v1/contact-requests")
      .send({ recipientUsername: "creator_one", type: "HIRE", subject: "Project role", message: "I would like to discuss this project role with you." });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires authentication for inbox, messaging, and notifications", async () => {
    const paths = [
      ["/api/v1/contact-requests", "get"],
      ["/api/v1/messages/conversations", "get"],
      ["/api/v1/notifications", "get"],
    ] as const;
    for (const [path, method] of paths) {
      const response = await request(app)[method](path);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("validates password reset input without accessing storage", async () => {
    const response = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: "not-an-email", code: "123", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("explains when Google OAuth is not configured", async () => {
    const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"] as const;
    const previous = keys.map((key) => process.env[key]);
    try {
      for (const key of keys) delete process.env[key];
      const response = await request(app).get("/api/v1/auth/google");
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("/login?error=google_not_configured");
    } finally {
      keys.forEach((key, index) => {
        const value = previous[index];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
    }
  });

  it("rejects a Google OAuth callback without a matching state cookie", async () => {
    const response = await request(app).get("/api/v1/auth/google/callback?state=invalid&code=fake");
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("/login?error=google_invalid_state");
  });
});
