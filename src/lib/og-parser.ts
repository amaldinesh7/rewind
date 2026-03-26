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
      headers: { "User-Agent": "RewindBot/1.0" },
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
