import { Hono } from "hono";
import { db } from "../db";
import { items } from "../db/schema";
import { eq, ne, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

export const itemsRoute = new Hono();

const ALLOWED_UPDATE_FIELDS = ["status", "note", "title"];

// List items
itemsRoute.get("/api/items", authMiddleware, async (c) => {
  const status = c.req.query("status");
  const platform = c.req.query("platform");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  const conditions = [];

  if (status) {
    conditions.push(eq(items.status, status));
  } else {
    conditions.push(ne(items.status, "deleted"));
  }

  if (platform) {
    conditions.push(eq(items.sourcePlatform, platform));
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [data, countResult] = await Promise.all([
    db.select().from(items).where(where).orderBy(desc(items.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(items).where(where),
  ]);

  return c.json({
    items: data,
    total: Number(countResult[0].count),
    limit,
    offset,
  });
});

// Get single item
itemsRoute.get("/api/items/:id", authMiddleware, async (c) => {
  const id = c.req.param("id") as string;

  const [row] = await db.select().from(items).where(eq(items.id, id));

  if (!row) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(row);
});

// Update item
itemsRoute.patch("/api/items/:id", authMiddleware, async (c) => {
  const id = c.req.param("id") as string;
  const body = await c.req.json();

  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
      return c.json({ error: `Field '${key}' is not updatable. Allowed: ${ALLOWED_UPDATE_FIELDS.join(", ")}` }, 400);
    }
    updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  // Handle updated_at in application code (no database trigger)
  updates.updatedAt = new Date();

  const [row] = await db.update(items).set(updates).where(eq(items.id, id)).returning();

  if (!row) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(row);
});
