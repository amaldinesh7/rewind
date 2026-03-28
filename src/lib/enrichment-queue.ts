import { eq, and, lt, or, isNull } from "drizzle-orm";
import { db } from "../db";
import { items } from "../db/schema";
import { enrichItem, enrichTextItem } from "./enrichment";

const BATCH_SIZE = 5;
const STALE_MINUTES = 5;

async function processQueue(): Promise<void> {
  try {
    // Reset stale "processing" items (stuck > 5 min)
    const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
    await db.update(items)
      .set({ enrichmentStatus: "pending", processingStartedAt: null })
      .where(
        and(
          eq(items.enrichmentStatus, "processing"),
          lt(items.processingStartedAt, staleThreshold)
        )
      );

    // Pick pending items that haven't exceeded retry limit
    const pending = await db.select()
      .from(items)
      .where(
        and(
          eq(items.enrichmentStatus, "pending"),
          or(isNull(items.retryCount), lt(items.retryCount, 3))
        )
      )
      .orderBy(items.createdAt)
      .limit(BATCH_SIZE);

    for (const item of pending) {
      if (item.sourceType === "url" && item.rawUrl) {
        await enrichItem(item.id, item.rawUrl);
      } else if (item.sourceType === "text" && item.rawText) {
        await enrichTextItem(item.id, item.rawText);
      } else {
        // Mark items we can't enrich as done (images, voice without URL)
        await db.update(items)
          .set({ enrichmentStatus: "done", enrichedAt: new Date() })
          .where(eq(items.id, item.id));
      }
    }

    if (pending.length > 0) {
      console.log(`[queue] Processed ${pending.length} items`);
    }
  } catch (error) {
    console.error("[queue] Error:", error);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startEnrichmentQueue(intervalMs = 30000): void {
  if (intervalId) return;
  console.log(`[queue] Starting enrichment queue (every ${intervalMs / 1000}s)`);
  intervalId = setInterval(processQueue, intervalMs);
  processQueue();
}

export function stopEnrichmentQueue(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
