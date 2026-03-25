import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { authMiddleware } from "../middleware/auth";

export const itemsRoute = new Hono();

const ALLOWED_UPDATE_FIELDS = ["status", "note", "title"];

// List items
itemsRoute.get("/api/items", authMiddleware, async (c) => {
  const status = c.req.query("status");
  const platform = c.req.query("platform");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  let query = supabase
    .from("items")
    .select("*", { count: "exact" });

  // Always exclude deleted unless explicitly requested
  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "deleted");
  }

  if (platform) {
    query = query.eq("source_platform", platform);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: "Failed to fetch items" }, 500);
  }

  return c.json({
    items: data || [],
    total: count || 0,
    limit,
    offset,
  });
});

// Get single item
itemsRoute.get("/api/items/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(data);
});

// Update item
itemsRoute.patch("/api/items/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  // Only allow updating specific fields
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

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(data);
});
