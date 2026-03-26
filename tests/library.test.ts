import { describe, it, expect } from "vitest";
import app from "../src/index";

const AUTH_HEADER = { Authorization: `Bearer ${process.env.API_KEY}` };

describe("Library API", () => {
  it("GET /api/library/stats returns categories and platforms", async () => {
    const res = await app.request("/api/library/stats", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("categories");
    expect(body).toHaveProperty("platforms");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.platforms)).toBe(true);
  });

  it("GET /api/library/search requires q param", async () => {
    const res = await app.request("/api/library/search", { headers: AUTH_HEADER });
    expect(res.status).toBe(400);
  });

  it("GET /api/library/search returns items", async () => {
    const res = await app.request("/api/library/search?q=test", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("GET /api/library/resurface returns items array", async () => {
    const res = await app.request("/api/library/resurface", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("GET /api/items?category=Tech filters by category", async () => {
    const res = await app.request("/api/items?category=Tech", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
  });

  it("GET /api/items?source=text filters by source type", async () => {
    const res = await app.request("/api/items?source=text", { headers: AUTH_HEADER });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("items");
  });
});
