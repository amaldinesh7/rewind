import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../src/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// Also mock the schema to avoid import issues
vi.mock("../src/db/schema", () => ({
  items: {
    id: "id",
    status: "status",
    sourcePlatform: "source_platform",
    createdAt: "created_at",
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
    const chainMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([{ id: "1", status: "inbox" }]),
            }),
          }),
        }),
      }),
    };
    const countChainMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    };

    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? chainMock : countChainMock;
    });

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
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "test-id", status: "inbox" }]),
      }),
    });

    const res = await app.request("/api/items/test-id", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("test-id");
  });

  it("returns 404 for missing item", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
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
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "test-id", status: "archived" }]),
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
