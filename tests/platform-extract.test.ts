import { describe, it, expect } from "vitest";
import { extractPlatformData } from "../src/lib/platform-extract";

describe("extractPlatformData", () => {
  it("extracts YouTube video ID and thumbnail", () => {
    const result = extractPlatformData("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", {});
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.thumbnailUrl).toContain("dQw4w9WgXcQ");
  });

  it("extracts YouTube video ID from short URL", () => {
    const result = extractPlatformData("https://youtu.be/dQw4w9WgXcQ", "youtube", {});
    expect(result.videoId).toBe("dQw4w9WgXcQ");
  });

  it("extracts Reddit subreddit", () => {
    const result = extractPlatformData("https://www.reddit.com/r/programming/comments/abc/test", "reddit", {});
    expect(result.subreddit).toBe("r/programming");
  });

  it("extracts Twitter author handle", () => {
    const result = extractPlatformData("https://twitter.com/elonmusk/status/12345", "twitter", {});
    expect(result.authorHandle).toBe("@elonmusk");
  });

  it("extracts Instagram author from OG title", () => {
    const result = extractPlatformData("https://www.instagram.com/p/abc123", "instagram", {
      title: "Photo by John Doe on Instagram"
    });
    expect(result.authorName).toBe("John Doe");
  });

  it("returns empty for generic URLs", () => {
    const result = extractPlatformData("https://example.com/article", "web", {});
    expect(Object.keys(result).length).toBe(0);
  });
});
