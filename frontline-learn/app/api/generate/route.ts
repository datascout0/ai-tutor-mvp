import { NextResponse } from "next/server";
import { groqJson, hasGroqKey } from "@/lib/groq";
import { normaliseCourse } from "@/lib/normalise";
import { generatePrompt, GENERATE_SYSTEM } from "@/lib/prompts";
import { DEMO_COURSES, getSample } from "@/lib/samples";
import type { GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const started = Date.now();
  let body: { sourceText?: string; sampleId?: string | null; role?: string; forceDemo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const sourceText = (body.sourceText ?? "").trim();
  const role = (body.role ?? "Store team member").trim();
  if (sourceText.length < 80) {
    return NextResponse.json({ error: "Paste a longer source document (at least a few sentences)." }, { status: 400 });
  }
  if (sourceText.length > 8000) {
    return NextResponse.json({ error: "Source is too long for this prototype (max ~8,000 characters)." }, { status: 400 });
  }

  const sample = getSample(body.sampleId);
  const sampleUnchanged = sample && sample.sourceText.trim() === sourceText;
  const useDemo = body.forceDemo || !hasGroqKey();

  if (useDemo) {
    if (!sampleUnchanged || !sample) {
      return NextResponse.json(
        {
          error: "Demo mode only works with the two sample documents, unedited.",
          hint: "Add GROQ_API_KEY to .env.local (or your Vercel project) to generate courses from your own text.",
        },
        { status: 400 },
      );
    }
    // Small delay so the demo feels like a real generation step.
    await new Promise((r) => setTimeout(r, 700));
    const response: GenerateResponse = {
      course: structuredClone(DEMO_COURSES[sample.id]),
      mode: "demo",
      generationMs: Date.now() - started,
    };
    return NextResponse.json(response);
  }

  try {
    const { data, model } = await groqJson(GENERATE_SYSTEM, generatePrompt(sourceText, role));
    const course = normaliseCourse(data, role, "en");
    if (course.cards.length === 0 || course.questions.length === 0) {
      throw new Error("The model returned an empty course");
    }
    const response: GenerateResponse = { course, mode: "live", model, generationMs: Date.now() - started };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message, hint: "Try again. If it keeps failing, use a sample document." }, { status: 502 });
  }
}
