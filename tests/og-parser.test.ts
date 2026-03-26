import { describe, it, expect } from "vitest";
import { parseOGFromHTML } from "../src/lib/og-parser";

describe("parseOGFromHTML", () => {
  it("extracts og:title, og:image, og:description, og:site_name", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Test Page Title">
        <meta property="og:description" content="A test description">
        <meta property="og:image" content="https://example.com/image.jpg">
        <meta property="og:site_name" content="Example Site">
      </head><body></body></html>
    `;
    const result = parseOGFromHTML(html);
    expect(result.title).toBe("Test Page Title");
    expect(result.description).toBe("A test description");
    expect(result.image).toBe("https://example.com/image.jpg");
    expect(result.siteName).toBe("Example Site");
  });

  it("falls back to <title> tag", () => {
    const html = `<html><head><title>Fallback Title</title></head><body></body></html>`;
    const result = parseOGFromHTML(html);
    expect(result.title).toBe("Fallback Title");
    expect(result.description).toBeUndefined();
  });

  it("handles meta name= syntax", () => {
    const html = `
      <html><head>
        <meta name="og:title" content="Name Syntax Title">
      </head><body></body></html>
    `;
    const result = parseOGFromHTML(html);
    expect(result.title).toBe("Name Syntax Title");
  });

  it("returns empty for garbage HTML", () => {
    const result = parseOGFromHTML("not html at all");
    expect(result.title).toBeUndefined();
  });
});
