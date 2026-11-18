import type { Card, Course, Lang, Level, Question } from "./types";

/** Defensive normalisation of model output into the Course shape the UI expects. */

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function shuffleWithAnswer(options: string[], answerIndex: number): { options: string[]; answerIndex: number } {
  const correct = options[answerIndex];
  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { options: copy, answerIndex: copy.indexOf(correct) };
}

export function normaliseCourse(raw: unknown, role: string, language: Lang, shuffle = true): Course {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawCards = Array.isArray(obj.cards) ? obj.cards : [];
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];

  const cards: Card[] = rawCards.slice(0, 6).map((c, i) => {
    const r = (c ?? {}) as Record<string, unknown>;
    return {
      id: `c${i + 1}`,
      title: str(r.title, `Card ${i + 1}`),
      body: str(r.body),
      sourceQuote: str(r.sourceQuote),
    };
  });
  const cardIds = new Set(cards.map((c) => c.id));
  const idMap = new Map<string, string>();
  rawCards.slice(0, 6).forEach((c, i) => {
    const r = (c ?? {}) as Record<string, unknown>;
    if (typeof r.id === "string") idMap.set(r.id, `c${i + 1}`);
  });

  const questions: Question[] = [];
  rawQuestions.slice(0, 9).forEach((q, i) => {
    const r = (q ?? {}) as Record<string, unknown>;
    const options = Array.isArray(r.options) ? r.options.map((o) => str(o)).filter(Boolean).slice(0, 5) : [];
    let answerIndex = typeof r.answerIndex === "number" ? r.answerIndex : Number(r.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) answerIndex = 0;
    if (options.length < 2) return;
    const levelNum = Number(r.level);
    const level = (levelNum >= 1 && levelNum <= 3 ? Math.round(levelNum) : 2) as Level;
    const rawCardId = str(r.cardId);
    const cardId = idMap.get(rawCardId) ?? (cardIds.has(rawCardId) ? rawCardId : cards[0]?.id ?? "c1");
    const shuffled = shuffle ? shuffleWithAnswer(options, answerIndex) : { options, answerIndex };
    questions.push({
      id: `q${questions.length + 1}`,
      level,
      prompt: str(r.prompt, `Question ${i + 1}`),
      options: shuffled.options,
      answerIndex: shuffled.answerIndex,
      explanation: str(r.explanation),
      sourceQuote: str(r.sourceQuote),
      cardId,
    });
  });

  return {
    title: str(obj.title, "New course"),
    role: str(obj.role, role),
    language,
    cards,
    questions,
  };
}

/** For translations: keep structure, ids and answers from the original; take only text from the model. */
export function mergeTranslation(original: Course, raw: unknown, language: Lang): Course {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const tCards = new Map<string, Record<string, unknown>>();
  const tQuestions = new Map<string, Record<string, unknown>>();
  (Array.isArray(obj.cards) ? obj.cards : []).forEach((c) => {
    const r = (c ?? {}) as Record<string, unknown>;
    if (typeof r.id === "string") tCards.set(r.id, r);
  });
  (Array.isArray(obj.questions) ? obj.questions : []).forEach((q) => {
    const r = (q ?? {}) as Record<string, unknown>;
    if (typeof r.id === "string") tQuestions.set(r.id, r);
  });

  return {
    title: str(obj.title, original.title),
    role: str(obj.role, original.role),
    language,
    cards: original.cards.map((c) => {
      const t = tCards.get(c.id);
      return { ...c, title: str(t?.title, c.title), body: str(t?.body, c.body) };
    }),
    questions: original.questions.map((q) => {
      const t = tQuestions.get(q.id);
      const tOptions = Array.isArray(t?.options) ? (t!.options as unknown[]).map((o) => str(o)) : [];
      return {
        ...q,
        prompt: str(t?.prompt, q.prompt),
        options: tOptions.length === q.options.length ? tOptions : q.options,
        explanation: str(t?.explanation, q.explanation),
      };
    }),
  };
}
