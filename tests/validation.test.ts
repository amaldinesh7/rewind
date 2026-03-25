import { describe, it, expect } from "vitest";
import { validateCaptureRequest } from "../src/lib/validation";

describe("validateCaptureRequest", () => {
  it("accepts valid URL capture", () => {
    const result = validateCaptureRequest({ type: "url", url: "https://youtube.com/watch?v=abc" });
    expect(result).toEqual({ valid: true });
  });

  it("rejects URL capture without url field", () => {
    const result = validateCaptureRequest({ type: "url" });
    expect(result).toEqual({ valid: false, error: "url is required for type 'url'" });
  });

  it("accepts valid text capture", () => {
    const result = validateCaptureRequest({ type: "text", content: "My idea" });
    expect(result).toEqual({ valid: true });
  });

  it("rejects text capture without content field", () => {
    const result = validateCaptureRequest({ type: "text" });
    expect(result).toEqual({ valid: false, error: "content is required for type 'text'" });
  });

  it("accepts valid image capture", () => {
    const result = validateCaptureRequest({ type: "image", image_base64: "data:image/png;base64,abc" });
    expect(result).toEqual({ valid: true });
  });

  it("rejects image capture without image_base64 field", () => {
    const result = validateCaptureRequest({ type: "image" });
    expect(result).toEqual({ valid: false, error: "image_base64 is required for type 'image'" });
  });

  it("accepts valid voice capture", () => {
    const result = validateCaptureRequest({ type: "voice", audio_base64: "data:audio/m4a;base64,abc" });
    expect(result).toEqual({ valid: true });
  });

  it("rejects voice capture without audio_base64 field", () => {
    const result = validateCaptureRequest({ type: "voice" });
    expect(result).toEqual({ valid: false, error: "audio_base64 is required for type 'voice'" });
  });

  it("rejects missing type", () => {
    const result = validateCaptureRequest({});
    expect(result).toEqual({ valid: false, error: "type is required and must be one of: url, text, image, voice" });
  });

  it("rejects invalid type", () => {
    const result = validateCaptureRequest({ type: "video" });
    expect(result).toEqual({ valid: false, error: "type is required and must be one of: url, text, image, voice" });
  });
});
