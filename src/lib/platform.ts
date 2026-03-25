const PLATFORM_RULES: Array<{ match: string[]; platform: string }> = [
  { match: ["youtube.com", "youtu.be"], platform: "youtube" },
  { match: ["instagram.com"], platform: "instagram" },
  { match: ["linkedin.com"], platform: "linkedin" },
  { match: ["twitter.com", "x.com"], platform: "twitter" },
  { match: ["tiktok.com"], platform: "tiktok" },
  { match: ["reddit.com"], platform: "reddit" },
  { match: ["github.com"], platform: "github" },
];

export function detectPlatform(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }

  for (const rule of PLATFORM_RULES) {
    if (rule.match.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return rule.platform;
    }
  }

  return "web";
}
