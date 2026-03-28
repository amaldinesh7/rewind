import { fetchRedditJSON, fetchVxTwitter, fetchTikTokOEmbed, fetchNoembedFallback } from "./platform-fetchers";

export interface OGData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export function parseOGFromHTML(html: string): OGData {
  const result: OGData = {};

  // Match <meta property="og:*" content="*"> and <meta name="og:*" content="*">
  const metaRegex = /<meta\s+(?:property|name)=["']og:(\w+)["']\s+content=["']([^"']*)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const [, key, value] = match;
    switch (key) {
      case "title": result.title = value; break;
      case "description": result.description = value; break;
      case "image": result.image = value; break;
      case "site_name": result.siteName = value; break;
    }
  }

  // Also match content="..." property="og:..." (reversed attribute order)
  const metaReversed = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']og:(\w+)["']/gi;
  while ((match = metaReversed.exec(html)) !== null) {
    const [, value, key] = match;
    switch (key) {
      case "title": result.title = result.title ?? value; break;
      case "description": result.description = result.description ?? value; break;
      case "image": result.image = result.image ?? value; break;
      case "site_name": result.siteName = result.siteName ?? value; break;
    }
  }

  // Fallback to <title> tag
  if (!result.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
  }

  return result;
}

export async function fetchOG(url: string): Promise<OGData> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return {};

    const html = await response.text();
    return parseOGFromHTML(html);
  } catch {
    return {};
  }
}

async function fetchInstagramOEmbed(url: string): Promise<OGData> {
  try {
    const oembed = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembed, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      title: data.author_name ? `${data.author_name} on Instagram` : data.title || undefined,
      description: data.title || undefined,
      image: data.thumbnail_url || undefined,
      siteName: "Instagram",
    };
  } catch {
    return {};
  }
}

async function fetchYouTubeOEmbed(url: string): Promise<OGData> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembed, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      title: data.title || undefined,
      image: data.thumbnail_url || undefined,
      siteName: "YouTube",
    };
  } catch {
    return {};
  }
}

export async function fetchOGWithFallback(url: string, platform: string): Promise<OGData> {
  // Step 1: Try platform-specific API first
  let platformData: OGData = {};
  if (platform === "reddit") {
    platformData = await fetchRedditJSON(url);
  } else if (platform === "twitter") {
    platformData = await fetchVxTwitter(url);
  } else if (platform === "tiktok") {
    platformData = await fetchTikTokOEmbed(url);
  }

  // Step 2: Standard OG scraping
  const og = await fetchOG(url);

  // If platform API returned a title, merge: platform API takes priority, OG image as fallback
  if (platformData.title) {
    const merged: OGData = {
      ...og,
      ...platformData,
      image: platformData.image ?? og.image,
    };

    // Step 3: Existing oEmbed fallbacks for Instagram and YouTube
    if (platform === "instagram" && !merged.title && !merged.image) {
      const oembed = await fetchInstagramOEmbed(url);
      return { ...merged, ...oembed };
    }
    if (platform === "youtube" && !merged.title) {
      const oembed = await fetchYouTubeOEmbed(url);
      return { ...merged, ...oembed };
    }

    return merged;
  }

  // Step 3: Existing oEmbed fallbacks for Instagram and YouTube
  if (platform === "instagram" && !og.title && !og.image) {
    const oembed = await fetchInstagramOEmbed(url);
    return { ...og, ...oembed };
  }

  if (platform === "youtube" && !og.title) {
    const oembed = await fetchYouTubeOEmbed(url);
    return { ...og, ...oembed };
  }

  // Step 4: If still no title AND no image, try fetchNoembedFallback as last resort
  if (!og.title && !og.image) {
    const noembed = await fetchNoembedFallback(url);
    return { ...og, ...noembed };
  }

  return og;
}
