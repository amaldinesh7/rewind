export interface AIResult {
  summary: string;
  tags: string[];
  category: string;
  contentType: string;
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function summarizeWithAI(input: {
  url: string;
  title?: string;
  description?: string;
  platform: string;
}): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback(input.description);
  }

  const prompt = `Analyze this web content and return JSON only, no markdown:

URL: ${input.url}
Title: ${input.title || "unknown"}
Description: ${input.description || "none"}
Platform: ${input.platform}

Return exactly this JSON format:
{
  "summary": "1-2 sentence summary of the content",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "one of: Tech, Entertainment, News, Fashion, Food, Finance, Health, Sports, Education, Travel, Shopping, Social, Other",
  "contentType": "one of: article, video, image, discussion, product, profile, other"
}`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return fallback(input.description);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallback(input.description);

    // Extract JSON from response (Gemini may wrap in ```json blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback(input.description);

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || input.description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || "Other",
      contentType: parsed.contentType || "other",
    };
  } catch {
    return fallback(input.description);
  }
}

function fallback(description?: string): AIResult {
  return {
    summary: description || "",
    tags: [],
    category: "Other",
    contentType: "other",
  };
}
