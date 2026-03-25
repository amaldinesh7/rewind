import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { detectPlatform } from "../lib/platform";
import { validateCaptureRequest } from "../lib/validation";
import { authMiddleware } from "../middleware/auth";

export const captureRoute = new Hono();

captureRoute.post("/api/capture", authMiddleware, async (c) => {
  const body = await c.req.json();

  const validation = validateCaptureRequest(body);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Build the row to insert
  const row: Record<string, unknown> = {
    source_type: body.type,
    source_platform: body.source_platform || "manual",
    note: body.note || null,
  };

  switch (body.type) {
    case "url":
      row.raw_url = body.url;
      if (!body.source_platform) {
        row.source_platform = detectPlatform(body.url);
      }
      break;

    case "text":
      row.raw_text = body.content;
      break;

    case "image": {
      // Strip data URI prefix if present
      const imageData = body.image_base64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(imageData, "base64");

      // Insert row first to get the ID
      const { data: tempRow, error: tempError } = await supabase
        .from("items")
        .insert({ source_type: "image", source_platform: body.source_platform || "screenshot", note: body.note || null, raw_image_path: "pending" })
        .select()
        .single();

      if (tempError || !tempRow) {
        return c.json({ error: "Failed to create item" }, 500);
      }

      const storagePath = `screenshots/${tempRow.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(storagePath, imageBuffer, { contentType: "image/png" });

      if (uploadError) {
        return c.json({ error: "Failed to upload image" }, 500);
      }

      // Update with real path
      const { data: updated, error: updateError } = await supabase
        .from("items")
        .update({ raw_image_path: storagePath })
        .eq("id", tempRow.id)
        .select()
        .single();

      if (updateError || !updated) {
        return c.json({ error: "Failed to update item" }, 500);
      }

      return c.json(
        {
          id: updated.id,
          status: updated.status,
          created_at: updated.created_at,
          message: "Captured. Processing will happen in background.",
        },
        201
      );
    }

    case "voice": {
      const audioData = body.audio_base64.replace(/^data:audio\/\w+;base64,/, "");
      const audioBuffer = Buffer.from(audioData, "base64");

      const { data: tempRow, error: tempError } = await supabase
        .from("items")
        .insert({ source_type: "voice", source_platform: body.source_platform || "voice_memo", note: body.note || null, raw_voice_path: "pending" })
        .select()
        .single();

      if (tempError || !tempRow) {
        return c.json({ error: "Failed to create item" }, 500);
      }

      const storagePath = `voice/${tempRow.id}.m4a`;
      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(storagePath, audioBuffer, { contentType: "audio/mp4" });

      if (uploadError) {
        return c.json({ error: "Failed to upload audio" }, 500);
      }

      const { data: updated, error: updateError } = await supabase
        .from("items")
        .update({ raw_voice_path: storagePath })
        .eq("id", tempRow.id)
        .select()
        .single();

      if (updateError || !updated) {
        return c.json({ error: "Failed to update item" }, 500);
      }

      return c.json(
        {
          id: updated.id,
          status: updated.status,
          created_at: updated.created_at,
          message: "Captured. Processing will happen in background.",
        },
        201
      );
    }
  }

  // For URL and text types — simple insert
  const { data, error } = await supabase.from("items").insert(row).select().single();

  if (error || !data) {
    return c.json({ error: "Failed to create item" }, 500);
  }

  return c.json(
    {
      id: data.id,
      status: data.status,
      created_at: data.created_at,
      message: "Captured. Processing will happen in background.",
    },
    201
  );
});
