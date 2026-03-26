import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { items } from "./schema";

export const platformMetadata = pgTable("platform_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }).unique(),
  platform: text("platform").notNull(),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  ogSiteName: text("og_site_name"),
  platformData: jsonb("platform_data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
