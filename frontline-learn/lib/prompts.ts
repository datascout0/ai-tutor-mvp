import type { Course, Lang } from "./types";

export const GENERATE_SYSTEM =
  "You turn store procedures and product sheets into short, accurate micro-courses for frontline retail staff. " +
  "You never add facts, rules, numbers, prices or times that are not in the source. " +
  "You always answer with a single JSON object and nothing else.";

export function generatePrompt(sourceText: string, role: string): string {
  return `Learner role: ${role}

SOURCE DOCUMENT (the only allowed source of facts):
"""
${sourceText}
"""

Create a mobile micro-course for this role from the source above.

Return JSON with exactly this shape:
{
  "title": "short course title (max 7 words)",
  "role": "${role}",
  "cards": [
    { "id": "c1", "title": "max 6 words", "body": "max 35 words, plain language, speak to the learner as 'you'", "sourceQuote": "one sentence copied WORD FOR WORD from the source that supports this card" }
  ],
  "questions": [
    { "id": "q1", "level": 1, "prompt": "question text", "options": ["A", "B", "C", "D"], "answerIndex": 0, "explanation": "max 25 words", "sourceQuote": "one sentence copied WORD FOR WORD from the source", "cardId": "c1" }
  ]
}

Rules:
- Exactly 5 cards covering the most important points, in the order a learner needs them.
- Exactly 6 questions: 2 at level 1 (recall a fact), 2 at level 2 (apply it to a simple situation), 2 at level 3 (judgement in a realistic shop-floor scenario).
- Each question has 4 options, exactly one correct, with plausible wrong options.
- "cardId" is the card the question checks.
- "sourceQuote" must be copied exactly from the source, never paraphrased.
- Do not invent anything. If the source does not support a fact, leave it out. Fewer, accurate items are better than complete but invented ones.
- Keep every number, time and price exactly as written in the source.`;
}

export const TRANSLATE_SYSTEM =
  "You translate frontline training content for retail staff. Keep the meaning, the tone and every number exactly. " +
  "You always answer with a single JSON object and nothing else.";

const LANG_NAME: Record<Lang, string> = { en: "English", fr: "French", es: "Spanish" };

export function translatePrompt(course: Course, target: Lang): string {
  const payload = {
    title: course.title,
    role: course.role,
    cards: course.cards.map(({ id, title, body }) => ({ id, title, body })),
    questions: course.questions.map(({ id, prompt, options, explanation }) => ({ id, prompt, options, explanation })),
  };
  return `Translate this micro-course from English into ${LANG_NAME[target]} for store staff.

Rules:
- Translate only the text values. Keep every "id" unchanged and keep options in the same order.
- Keep every number, time, price, percentage and unit exactly as in the original (digits stay digits).
- Use natural, simple workplace language. Address the learner informally where that is normal in ${LANG_NAME[target]}.
- Return JSON with exactly the same structure.

${JSON.stringify(payload, null, 2)}`;
}
