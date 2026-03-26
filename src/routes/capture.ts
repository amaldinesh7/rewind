import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { items } from "../db/schema";
import { supabase } from "../lib/supabase";
import { detectPlatform } from "../lib/platform";
import { validateCaptureRequest } from "../lib/validation";
import { enrichItem } from "../lib/enrichment";
import { authMiddleware } from "../middleware/auth";

export const captureRoute = new Hono();

captureRoute.post("/api/capture", authMiddleware, async (c) => {
  const body = await c.req.json();

  const validation = validateCaptureRequest(body);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  switch (body.type) {
    case "url": {
      const platform = body.source_platform || detectPlatform(body.url);
      const [row] = await db.insert(items).values({
        sourceType: "url",
        sourcePlatform: platform,
        rawUrl: body.url,
        note: body.note || null,
        enrichmentStatus: "pending",
      }).returning();

      // Fire-and-forget enrichment
      enrichItem(row.id, body.url).catch((err) =>
        console.error("Enrichment error:", err)
      );

      return c.json({
        id: row.id,
        status: row.status,
        created_at: row.createdAt.toISOString(),
        message: "Captured. Processing will happen in background.",
      }, 201);
    }

    case "text": {
      const [row] = await db.insert(items).values({
        sourceType: "text",
        sourcePlatform: body.source_platform || "manual",
        rawText: body.content,
        note: body.note || null,
      }).returning();

      return c.json({
        id: row.id,
        status: row.status,
        created_at: row.createdAt.toISOString(),
        message: "Captured. Processing will happen in background.",
      }, 201);
    }

    case "image": {
      const imageData = body.image_base64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(imageData, "base64");

      const [row] = await db.insert(items).values({
        sourceType: "image",
        sourcePlatform: body.source_platform || "screenshot",
        rawImagePath: "pending",
        note: body.note || null,
      }).returning();

      const storagePath = `screenshots/${row.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(storagePath, imageBuffer, { contentType: "image/jpeg" });

      if (uploadError) {
        return c.json({ error: "Failed to upload image" }, 500);
      }

      const [updated] = await db.update(items)
        .set({ rawImagePath: storagePath })
        .where(eq(items.id, row.id))
        .returning();

      return c.json({
        id: updated.id,
        status: updated.status,
        created_at: updated.createdAt.toISOString(),
        message: "Captured. Processing will happen in background.",
      }, 201);
    }

    case "voice": {
      const audioData = body.audio_base64.replace(/^data:audio\/\w+;base64,/, "");
      const audioBuffer = Buffer.from(audioData, "base64");

      const [row] = await db.insert(items).values({
        sourceType: "voice",
        sourcePlatform: body.source_platform || "voice_memo",
        rawVoicePath: "pending",
        note: body.note || null,
      }).returning();

      const storagePath = `voice/${row.id}.m4a`;
      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(storagePath, audioBuffer, { contentType: "audio/mp4" });

      if (uploadError) {
        return c.json({ error: "Failed to upload audio" }, 500);
      }

      const [updated] = await db.update(items)
        .set({ rawVoicePath: storagePath })
        .where(eq(items.id, row.id))
        .returning();

      return c.json({
        id: updated.id,
        status: updated.status,
        created_at: updated.createdAt.toISOString(),
        message: "Captured. Processing will happen in background.",
      }, 201);
    }
  }
});
