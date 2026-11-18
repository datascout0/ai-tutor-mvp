/**
 * Minimal Groq client (OpenAI-compatible chat completions), same approach as Learnext.
 * Tries the primary model first and falls back once on rate limits or bad JSON.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"];

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

export async function groqJson(system: string, user: string): Promise<{ data: unknown; model: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const resp = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
        if (!resp.ok) {
          const body = await resp.text();
          lastError = new Error(`Groq HTTP ${resp.status}: ${body.slice(0, 200)}`);
          if (resp.status === 429 || resp.status >= 500) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break; // other errors: try next model
        }
        const json = await resp.json();
        const content: string | undefined = json?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty response from model");
        return { data: extractJsonObject(content), model };
      } catch (err) {
        lastError = err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Generation failed");
}
