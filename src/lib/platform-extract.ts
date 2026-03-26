interface OGPartial {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export function extractPlatformData(
  url: string,
  platform: string,
  og: OGPartial
): Record<string, string> {
  switch (platform) {
    case "youtube": return extractYouTube(url);
    case "reddit": return extractReddit(url);
    case "twitter": return extractTwitter(url);
    case "instagram": return extractInstagram(url, og);
    case "linkedin": return extractLinkedIn(og);
    default: return {};
  }
}

function extractYouTube(url: string): Record<string, string> {
  const result: Record<string, string> = {};

  // youtube.com/watch?v=ID or youtu.be/ID
  try {
    const parsed = new URL(url);
    let videoId = parsed.searchParams.get("v");
    if (!videoId && parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }
    if (videoId) {
      result.videoId = videoId;
      result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {}

  return result;
}

function extractReddit(url: string): Record<string, string> {
  const result: Record<string, string> = {};

  const subredditMatch = url.match(/reddit\.com\/(r\/[^/]+)/);
  if (subredditMatch) {
    result.subreddit = subredditMatch[1];
  }

  return result;
}

function extractTwitter(url: string): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 1 && parts[0] !== "search" && parts[0] !== "hashtag") {
      result.authorHandle = `@${parts[0]}`;
    }
  } catch {}

  return result;
}

function extractInstagram(url: string, og: OGPartial): Record<string, string> {
  const result: Record<string, string> = {};

  // OG title pattern: "Photo by John Doe on Instagram" or "@handle on Instagram"
  if (og.title) {
    const byMatch = og.title.match(/(?:Photo |Video )?by (.+?) on Instagram/i);
    if (byMatch) {
      result.authorName = byMatch[1];
    }
    const handleMatch = og.title.match(/^(@\w+)/);
    if (handleMatch && !result.authorName) {
      result.authorName = handleMatch[1];
    }
  }

  return result;
}

function extractLinkedIn(og: OGPartial): Record<string, string> {
  const result: Record<string, string> = {};

  if (og.title) {
    result.articleTitle = og.title;
  }

  return result;
}
