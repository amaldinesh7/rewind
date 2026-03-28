import type { OGData } from "./og-parser";

export async function fetchRedditJSON(url: string): Promise<OGData> {
  try {
    const parsed = new URL(url);
    const jsonUrl = `${parsed.origin}${parsed.pathname.replace(/\/?$/, ".json")}${parsed.search}`;
    const response = await fetch(jsonUrl, {
      headers: { "User-Agent": "bot:Rewind:v1.0 (personal content manager)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {};
    const data = await response.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    if (!post) return {};
    const selftext: string = post.selftext ?? "";
    const description = selftext.length > 300 ? selftext.slice(0, 300) + "…" : selftext || undefined;
    const previewImage: string | undefined =
      post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") ?? undefined;
    return {
      title: post.title || undefined,
      description,
      image: previewImage,
      siteName: post.subreddit ? `r/${post.subreddit}` : "Reddit",
    };
  } catch {
    return {};
  }
}

export async function fetchVxTwitter(url: string): Promise<OGData> {
  try {
    const parsed = new URL(url);
    const apiUrl = `https://api.vxtwitter.com${parsed.pathname}`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      title: data.user_name ? `@${data.user_name}` : undefined,
      description: data.text || undefined,
      image: data.media_urls?.[0] || undefined,
      siteName: "Twitter",
    };
  } catch {
    return {};
  }
}

export async function fetchTikTokOEmbed(url: string): Promise<OGData> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      title: data.title || undefined,
      description: data.author_name ? `by ${data.author_name}` : undefined,
      image: data.thumbnail_url || undefined,
      siteName: "TikTok",
    };
  } catch {
    return {};
  }
}

export async function fetchNoembedFallback(url: string): Promise<OGData> {
  try {
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {};
    const data = await response.json();
    if (data.error) return {};
    return {
      title: data.title || undefined,
      image: data.thumbnail_url || undefined,
      siteName: data.provider_name || undefined,
    };
  } catch {
    return {};
  }
}
