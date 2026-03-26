import { Hono } from "hono";
import { db } from "../db";
import { items } from "../db/schema";
import { eq, ne, and, desc, lt, sql, ilike, or } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

export const libraryRoute = new Hono();

const CATEGORY_EMOJIS: Record<string, string> = {
  Tech: "💻",
  Entertainment: "🎬",
  News: "📰",
  Fashion: "👗",
  Food: "🍔",
  Finance: "💰",
  Health: "🏥",
  Sports: "⚽",
  Education: "📚",
  Travel: "✈️",
  Shopping: "🛍️",
  Social: "👥",
  Other: "📌",
};

// Stats for dashboard
libraryRoute.get("/api/library/stats", authMiddleware, async (c) => {
  const notDeleted = ne(items.status, "deleted");

  // Category counts
  const categoryRows = await db
    .select({
      name: items.aiCategory,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(and(notDeleted, sql`${items.aiCategory} IS NOT NULL`))
    .groupBy(items.aiCategory);

  const categories = categoryRows.map((row) => ({
    name: row.name as string,
    count: Number(row.count),
    emoji: CATEGORY_EMOJIS[row.name as string] || "📌",
  }));

  // Platform counts — URL items by sourcePlatform, non-URL by sourceType
  const platformRows = await db
    .select({
      name: sql<string>`CASE WHEN ${items.sourceType} = 'url' THEN ${items.sourcePlatform} ELSE ${items.sourceType} END`,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(notDeleted)
    .groupBy(sql`CASE WHEN ${items.sourceType} = 'url' THEN ${items.sourcePlatform} ELSE ${items.sourceType} END`);

  const platforms = platformRows
    .filter((row) => row.name)
    .map((row) => ({
      name: row.name,
      count: Number(row.count),
    }));

  // Total
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(notDeleted);

  return c.json({
    categories,
    platforms,
    total: Number(totalResult.count),
  });
});

// Search
libraryRoute.get("/api/library/search", authMiddleware, async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = parseInt(c.req.query("offset") || "0");
  const query = `%${q.trim()}%`;

  const searchCondition = and(
    ne(items.status, "deleted"),
    or(
      ilike(items.title, query),
      ilike(items.summary, query),
      ilike(items.note, query),
      ilike(items.rawText, query),
      ilike(items.rawUrl, query),
      sql`EXISTS (SELECT 1 FROM unnest(${items.aiTags}) AS tag WHERE tag ILIKE ${query})`
    )
  );

  const [data, countResult] = await Promise.all([
    db.select().from(items).where(searchCondition).orderBy(desc(items.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(items).where(searchCondition),
  ]);

  return c.json({
    items: data,
    total: Number(countResult[0].count),
    limit,
    offset,
  });
});

// Resurface — items to revisit
libraryRoute.get("/api/library/resurface", authMiddleware, async (c) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const data = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.status, "inbox"),
        lt(items.createdAt, threeDaysAgo)
      )
    )
    .orderBy(items.createdAt)
    .limit(3);

  return c.json({ items: data });
});
