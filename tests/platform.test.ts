import { describe, it, expect } from "vitest";
import { detectPlatform } from "../src/lib/platform";

describe("detectPlatform", () => {
  it("detects youtube.com", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });

  it("detects youtu.be short links", () => {
    expect(detectPlatform("https://youtu.be/abc")).toBe("youtube");
  });

  it("detects instagram.com", () => {
    expect(detectPlatform("https://www.instagram.com/p/abc")).toBe("instagram");
  });

  it("detects linkedin.com", () => {
    expect(detectPlatform("https://linkedin.com/posts/abc")).toBe("linkedin");
  });

  it("detects twitter.com", () => {
    expect(detectPlatform("https://twitter.com/user/status/123")).toBe("twitter");
  });

  it("detects x.com as twitter", () => {
    expect(detectPlatform("https://x.com/user/status/123")).toBe("twitter");
  });

  it("detects tiktok.com", () => {
    expect(detectPlatform("https://www.tiktok.com/@user/video/123")).toBe("tiktok");
  });

  it("detects reddit.com", () => {
    expect(detectPlatform("https://www.reddit.com/r/programming/")).toBe("reddit");
  });

  it("detects github.com", () => {
    expect(detectPlatform("https://github.com/user/repo")).toBe("github");
  });

  it("returns 'web' for unknown URLs", () => {
    expect(detectPlatform("https://example.com/page")).toBe("web");
  });

  it("returns 'web' for invalid URLs", () => {
    expect(detectPlatform("not-a-url")).toBe("web");
  });
});
