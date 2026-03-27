import { eq } from "drizzle-orm";
import { db } from "../db";
import { items } from "../db/schema";
import { platformMetadata } from "../db/platform-metadata";
import { fetchOGWithFallback } from "./og-parser";
import { detectPlatform } from "./platform";
import { extractPlatformData } from "./platform-extract";
import { summarizeWithAI } from "./ai-summarize";

export async function enrichItem(itemId: string, rawUrl: string): Promise<void> {
  try {
    // Mark as processing
    await db.update(items)
      .set({ enrichmentStatus: "processing" })
      .where(eq(items.id, itemId));

    // Phase 1: OG metadata (fast) — detect platform first for oEmbed fallback
    const platform = detectPlatform(rawUrl);
    const og = await fetchOGWithFallback(rawUrl, platform);

    // Update title + thumbnail immediately
    const phase1Updates: Record<string, unknown> = {};
    if (og.title) phase1Updates.title = og.title;
    if (og.image) phase1Updates.thumbnailUrl = og.image;

    if (Object.keys(phase1Updates).length > 0) {
      await db.update(items).set(phase1Updates).where(eq(items.id, itemId));
    }

    // Extract platform-specific data and insert platform_metadata
    const platData = extractPlatformData(rawUrl, platform, og);

    // For YouTube, use the extracted thumbnail if OG didn't have one
    if (platform === "youtube" && platData.thumbnailUrl && !og.image) {
      await db.update(items)
        .set({ thumbnailUrl: platData.thumbnailUrl })
        .where(eq(items.id, itemId));
    }

    await db.insert(platformMetadata).values({
      itemId,
      platform,
      ogTitle: og.title || null,
      ogDescription: og.description || null,
      ogImage: og.image || null,
      ogSiteName: og.siteName || null,
      platformData: platData,
    }).onConflictDoUpdate({
      target: platformMetadata.itemId,
      set: {
        platform,
        ogTitle: og.title || null,
        ogDescription: og.description || null,
        ogImage: og.image || null,
        ogSiteName: og.siteName || null,
        platformData: platData,
      },
    });

    // Phase 2: AI summarization (slower)
    const aiResult = await summarizeWithAI({
      url: rawUrl,
      title: og.title,
      description: og.description,
      platform,
    });

    await db.update(items).set({
      summary: aiResult.summary || null,
      aiTags: aiResult.tags.length > 0 ? aiResult.tags : null,
      aiCategory: aiResult.category || null,
      contentType: aiResult.contentType || null,
      enrichmentStatus: "done",
      enrichedAt: new Date(),
    }).where(eq(items.id, itemId));

  } catch (error) {
    console.error(`Enrichment failed for item ${itemId}:`, error);
    await db.update(items)
      .set({ enrichmentStatus: "failed" })
      .where(eq(items.id, itemId))
      .catch(() => {});
  }
}
