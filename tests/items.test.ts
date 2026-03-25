import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { Hono } from "hono";
import { itemsRoute } from "../src/routes/items";

const API_KEY = "test-key";
process.env.API_KEY = API_KEY;

const authHeader = { Authorization: `Bearer ${API_KEY}` };

function buildApp() {
  const app = new Hono();
  app.route("/", itemsRoute);
  return app;
}

describe("GET /api/items", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns paginated items", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [{ id: "1", status: "inbox" }],
              error: null,
              count: 1,
            }),
          }),
        }),
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [{ id: "1", status: "inbox" }],
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      }),
    };
    mockFrom.mockReturnValue(mockQuery);

    const res = await app.request("/api/items", { headers: authHeader });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.total).toBeDefined();
    expect(body.limit).toBeDefined();
    expect(body.offset).toBeDefined();
  });

  it("rejects without auth", async () => {
    const res = await app.request("/api/items");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/items/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns a single item", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "test-id", status: "inbox" },
            error: null,
          }),
        }),
      }),
    });

    const res = await app.request("/api/items/test-id", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("test-id");
  });

  it("returns 404 for missing item", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" },
          }),
        }),
      }),
    });

    const res = await app.request("/api/items/missing-id", { headers: authHeader });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/items/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("updates allowed fields", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "test-id", status: "archived" },
              error: null,
            }),
          }),
        }),
      }),
    });

    const res = await app.request("/api/items/test-id", {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("archived");
  });

  it("rejects disallowed fields", async () => {
    const res = await app.request("/api/items/test-id", {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: "hacked" }),
    });

    expect(res.status).toBe(400);
  });
});
