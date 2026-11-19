import { NextResponse } from "next/server";
import { groqJson, hasGroqKey } from "@/lib/groq";
import { mergeTranslation } from "@/lib/normalise";
import { translatePrompt, TRANSLATE_SYSTEM } from "@/lib/prompts";
import { DEMO_TRANSLATIONS } from "@/lib/samples";
import type { Course, Lang, TranslateResponse } from "@/lib/types";

export const runtime = "nodejs";
// Live generation can take several seconds when the first model is rate-limited and it falls back.
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { course?: Course; target?: Lang; sampleId?: string | null; forceDemo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { course, target, sampleId } = body;
  if (!course || (target !== "fr" && target !== "es")) {
    return NextResponse.json({ error: "Missing course or unsupported target language" }, { status: 400 });
  }

  // Unedited samples keep their pre-written translations (including the planted price error); everything else is live.
  const hasDemo = Boolean(sampleId && DEMO_TRANSLATIONS[sampleId]?.[target]);
  const useDemo = body.forceDemo || !hasGroqKey() || hasDemo;

  if (useDemo) {
    const demo = sampleId ? DEMO_TRANSLATIONS[sampleId]?.[target] : undefined;
    if (!demo) {
      return NextResponse.json(
        { error: "Demo translations exist only for the sample documents.", hint: "Add GROQ_API_KEY to translate your own courses." },
        { status: 400 },
      );
    }
    await new Promise((r) => setTimeout(r, 500));
    // Keep only items that survived manager review, in the reviewed course's order.
    const keepCards = new Set(course.cards.map((c) => c.id));
    const keepQuestions = new Set(course.questions.map((q) => q.id));
    const translated: Course = {
      ...structuredClone(demo),
      cards: demo.cards.filter((c) => keepCards.has(c.id)),
      questions: demo.questions.filter((q) => keepQuestions.has(q.id)),
    };
    const response: TranslateResponse = { course: translated, mode: "demo" };
    return NextResponse.json(response);
  }

  try {
    const { data, model } = await groqJson(TRANSLATE_SYSTEM, translatePrompt(course, target));
    const response: TranslateResponse = { course: mergeTranslation(course, data, target), mode: "live", model };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
