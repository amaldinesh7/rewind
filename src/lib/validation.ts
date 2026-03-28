type ValidationResult = { valid: true } | { valid: false; error: string };

const VALID_TYPES = ["url", "text", "image", "voice"] as const;

export function validateCaptureRequest(body: Record<string, unknown>): ValidationResult {
  const type = body.type;

  if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return { valid: false, error: "type is required and must be one of: url, text, image, voice" };
  }

  switch (type) {
    case "url":
      if (!body.url) return { valid: false, error: "url is required for type 'url'" };
      break;
    case "text":
      if (!body.content) return { valid: false, error: "content is required for type 'text'" };
      break;
    case "image":
      if (!body.image_base64 || typeof body.image_base64 !== "string") return { valid: false, error: "image_base64 must be a non-empty string for type 'image'" };
      break;
    case "voice":
      if (!body.audio_base64 || typeof body.audio_base64 !== "string") return { valid: false, error: "audio_base64 must be a non-empty string for type 'voice'" };
      break;
  }

  return { valid: true };
}
