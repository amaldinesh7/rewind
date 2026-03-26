import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  // What was captured
  sourceType: text("source_type").notNull(),
  sourcePlatform: text("source_platform").default("manual"),

  // Raw input
  rawUrl: text("raw_url"),
  rawText: text("raw_text"),
  rawImagePath: text("raw_image_path"),
  rawVoicePath: text("raw_voice_path"),
  note: text("note"),

  // Processing status
  status: text("status").default("inbox").notNull(),

  // AI-enriched fields (NULL initially)
  title: text("title"),
  summary: text("summary"),
  thumbnailUrl: text("thumbnail_url"),
  contentType: text("content_type"),
  aiTags: text("ai_tags").array(),
  aiCategory: text("ai_category"),
  estimatedMins: integer("estimated_mins"),

  // Enrichment
  enrichmentStatus: text("enrichment_status").default("none"),
  enrichedAt: timestamp("enriched_at", { withTimezone: true }),
});
