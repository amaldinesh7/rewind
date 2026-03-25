import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../src/db", () => {
  const mockReturning = vi.fn().mockResolvedValue([{
    id: "test-uuid-123",
    status: "inbox",
    createdAt: new Date("2026-03-26T00:00:00Z"),
  }]);

  return {
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockReturning,
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: mockReturning,
          }),
        }),
      }),
    },
  };
});

// Mock supabase (storage only)
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test" }, error: null }),
      })),
    },
  },
}));

import { Hono } from "hono";
import { captureRoute } from "../src/routes/capture";

const API_KEY = "test-key";
process.env.API_KEY = API_KEY;

function buildApp() {
  const app = new Hono();
  app.route("/", captureRoute);
  return app;
}

const authHeader = { Authorization: `Bearer ${API_KEY}` };

describe("POST /api/capture", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
  });

  it("captures a URL", async () => {
    const res = await app.request("/api/capture", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://youtube.com/watch?v=abc" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("test-uuid-123");
    expect(body.status).toBe("inbox");
    expect(body.message).toBeDefined();
  });

  it("captures text", async () => {
    const res = await app.request("/api/capture", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", content: "My idea for a project" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("test-uuid-123");
  });

  it("rejects missing type", async () => {
    const res = await app.request("/api/capture", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });

    expect(res.status).toBe(400);
  });

  it("rejects missing auth", async () => {
    const res = await app.request("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: "https://example.com" }),
    });

    expect(res.status).toBe(401);
  });

  it("rejects URL type without url field", async () => {
    const res = await app.request("/api/capture", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url" }),
    });

    expect(res.status).toBe(400);
  });
});
