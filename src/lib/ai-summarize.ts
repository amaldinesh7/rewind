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
    console.warn("[ai-summarize] No GEMINI_API_KEY set, using fallback");
    return fallback(input.description);
  }

  const prompt = `You are a content classifier. Analyze this web page and return a JSON object.

URL: ${input.url}
Title: ${input.title || "unknown"}
Description: ${input.description || "none"}
Platform: ${input.platform}

You MUST return a valid JSON object with these exact fields:
- "summary": A 1-2 sentence summary describing what this content is about.
- "tags": An array of 3-5 short lowercase keyword tags relevant to the content (e.g. ["coding", "ai", "developer-tools"]).
- "category": Exactly one of these values: Tech, Entertainment, News, Fashion, Food, Finance, Health, Sports, Education, Travel, Shopping, Social, Other.
- "contentType": Exactly one of these values: article, video, image, discussion, product, profile, other.

Important: Return ONLY the JSON object. No markdown, no code fences, no explanation.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown");
      console.error(`[ai-summarize] Gemini API error ${response.status}: ${errorText}`);
      return fallback(input.description);
    }

    const data = await response.json();

    // Check for blocked or empty responses
    if (data.candidates?.[0]?.finishReason === "SAFETY") {
      console.warn("[ai-summarize] Gemini blocked response for safety reasons");
      return fallback(input.description);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[ai-summarize] No text in Gemini response:", JSON.stringify(data).slice(0, 500));
      return fallback(input.description);
    }

    // With responseMimeType: "application/json", Gemini should return clean JSON.
    // But as a safety net, also try extracting from markdown fences.
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code fences or loose text
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        console.warn("[ai-summarize] Could not extract JSON from response:", text.slice(0, 300));
        return fallback(input.description);
      }
      parsed = JSON.parse(jsonMatch[1]);
    }

    return {
      summary: (parsed.summary as string) || input.description || "",
      tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 5) : [],
      category: (parsed.category as string) || "Other",
      contentType: (parsed.contentType as string) || "other",
    };
  } catch (err) {
    console.error("[ai-summarize] Error:", err instanceof Error ? err.message : err);
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
