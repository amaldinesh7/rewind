import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { items } from "../db/schema";
import { platformMetadata } from "../db/platform-metadata";
import { fetchOGWithFallback } from "./og-parser";
import { detectPlatform } from "./platform";
import { extractPlatformData } from "./platform-extract";
import { summarizeWithAI } from "./ai-summarize";

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function enrichItem(itemId: string, rawUrl: string): Promise<void> {
  try {
    // Mark as processing and record start time
    await db.update(items)
      .set({ enrichmentStatus: "processing", processingStartedAt: new Date() })
      .where(eq(items.id, itemId));

    // Increment retry_count
    await db.execute(sql`UPDATE items SET retry_count = COALESCE(retry_count, 0) + 1 WHERE id = ${itemId}`);

    // Phase 1: OG metadata (fast) — detect platform first for oEmbed fallback
    const platform = detectPlatform(rawUrl);
    const og = await fetchOGWithFallback(rawUrl, platform);

    // Update title, thumbnail, and preliminary summary immediately
    const phase1Updates: Record<string, unknown> = {};
    if (og.title) phase1Updates.title = decodeHTMLEntities(og.title);
    if (og.image) phase1Updates.thumbnailUrl = og.image;
    if (og.description) phase1Updates.summary = og.description.slice(0, 500);

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
      processingStartedAt: null,
    }).where(eq(items.id, itemId));

  } catch (error) {
    console.error(`Enrichment failed for item ${itemId}:`, error);

    // Check retry_count to decide whether to retry or fail permanently
    try {
      const rows = await db.select({ retryCount: items.retryCount }).from(items).where(eq(items.id, itemId));
      const retryCount = rows[0]?.retryCount ?? 0;

      if (retryCount >= 3) {
        await db.update(items)
          .set({ enrichmentStatus: "failed", processingStartedAt: null })
          .where(eq(items.id, itemId));
      } else {
        await db.update(items)
          .set({ enrichmentStatus: "pending", processingStartedAt: null })
          .where(eq(items.id, itemId));
      }
    } catch {
      // Best-effort: if we can't even update status, silently ignore
    }
  }
}

export async function enrichTextItem(itemId: string, rawText: string): Promise<void> {
  try {
    await db.update(items)
      .set({ enrichmentStatus: "processing" })
      .where(eq(items.id, itemId));

    const aiResult = await summarizeWithAI({
      url: "",
      title: rawText.slice(0, 100),
      description: rawText,
      platform: "manual",
    });

    await db.update(items).set({
      aiTags: aiResult.tags.length > 0 ? aiResult.tags : null,
      aiCategory: aiResult.category || null,
      contentType: aiResult.contentType || null,
      enrichmentStatus: "done",
      enrichedAt: new Date(),
    }).where(eq(items.id, itemId));

  } catch (error) {
    console.error(`Text enrichment failed for item ${itemId}:`, error);
    await db.update(items)
      .set({ enrichmentStatus: "failed" })
      .where(eq(items.id, itemId))
      .catch(() => {});
  }
}
