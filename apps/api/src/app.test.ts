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
});
