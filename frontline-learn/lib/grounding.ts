import type { Card, CheckResult, Course, ItemKind, Question } from "./types";

/**
 * Grounding checks: every AI-written line must trace back to the source procedure.
 * These are deliberately simple, deterministic rules a manager can understand,
 * not another model judging the first one.
 */

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "are", "with", "that", "this", "from", "into", "before",
  "after", "every", "each", "any", "all", "must", "should", "will", "can", "not", "our", "their",
  "them", "they", "have", "has", "was", "were", "been", "its", "it's", "then", "than", "also", "only",
]);

export const MATCH_THRESHOLD = 0.8;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Remove list numbering ("1. ", "2) ") so step numbers don't count as facts. */
function stripListNumbering(s: string): string {
  return s.replace(/^\s*\d+[.)]\s+/gm, "");
}

/** Turn French-style times ("9 h 30", "10h") into "9:30" / "10:00" before comparing. */
function normaliseTimes(s: string): string {
  return s
    .replace(/\b(\d{1,2})\s?h\s?(\d{2})\b/gi, "$1:$2")
    .replace(/\b(\d{1,2})\s?h\b/gi, "$1:00");
}

export function tokens(s: string): string[] {
  const clean = stripAccents(normaliseTimes(s)).toLowerCase().replace(/[’']/g, "'");
  return clean.match(/[a-z0-9]+(?:[.:,][0-9]+)?/g) ?? [];
}

function meaningful(toks: string[]): string[] {
  return toks.filter((t) => /\d/.test(t) || (t.length >= 3 && !STOPWORDS.has(t)));
}

export function splitSentences(source: string): string[] {
  return stripListNumbering(source)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter((s) => s.length > 3);
}

/** Share of the quote's meaningful words found in a sentence (1 = every word present). */
function containment(quote: string, sentence: string): number {
  const q = meaningful(tokens(quote));
  if (q.length === 0) return 0;
  const s = new Set(tokens(sentence));
  const hits = q.filter((t) => s.has(t)).length;
  return hits / q.length;
}

export function bestMatch(quote: string, source: string): { score: number; sentence?: string } {
  if (!quote || !quote.trim()) return { score: 0 };
  const sentences = splitSentences(source);
  let best = { score: 0, sentence: undefined as string | undefined };
  for (const sentence of sentences) {
    const score = containment(quote, sentence);
    if (score > best.score) best = { score, sentence };
  }
  return best;
}

/** Normalise a number so "09:30", "9 h 30" and "9:30" compare equal, and "4,5" equals "4.5". */
function normaliseNumber(n: string): string {
  if (n.includes(":")) {
    const [h, m] = n.split(":");
    return `${parseInt(h, 10)}:${m}`;
  }
  const dec = n.replace(",", ".");
  const value = parseFloat(dec);
  return Number.isNaN(value) ? n : String(value);
}

export function extractNumbers(text: string): string[] {
  const clean = normaliseTimes(stripListNumbering(text));
  const found = clean.match(/\d+(?:[.:,]\d+)?/g) ?? [];
  return found.map(normaliseNumber);
}

function sourceNumberSet(source: string): Set<string> {
  return new Set(extractNumbers(source));
}

function checkText(
  itemId: string,
  kind: ItemKind,
  quote: string,
  factualText: string,
  source: string,
): CheckResult {
  const reasons: string[] = [];
  const { score, sentence } = bestMatch(quote, source);

  if (!quote || !quote.trim()) {
    reasons.push("No source line given, so this can't be traced to your procedure.");
  } else if (score < MATCH_THRESHOLD) {
    reasons.push("The quoted source line isn't in your procedure. The AI may have added this.");
  }

  const allowed = sourceNumberSet(source);
  const unknown = Array.from(new Set(extractNumbers(factualText).filter((n) => !allowed.has(n))));
  if (unknown.length > 0) {
    reasons.push(`Uses ${unknown.length === 1 ? "a number" : "numbers"} not in your procedure: ${unknown.join(", ")}.`);
  }

  return {
    itemId,
    kind,
    grounded: reasons.length === 0,
    reasons,
    matchedSentence: sentence,
    matchScore: Math.round(score * 100) / 100,
  };
}

export function checkCard(card: Card, source: string): CheckResult {
  return checkText(card.id, "card", card.sourceQuote, `${card.title} ${card.body}`, source);
}

/**
 * For questions, only the correct answer is fact-checked for numbers.
 * Distractors are meant to be wrong, and scenario prompts may use made-up context
 * ("It's 9:58 and a customer is waiting…").
 */
export function checkQuestion(q: Question, source: string): CheckResult {
  const correct = q.options[q.answerIndex] ?? "";
  return checkText(q.id, "question", q.sourceQuote, correct, source);
}

export function checkCourse(course: Course, source: string): Record<string, CheckResult> {
  const results: Record<string, CheckResult> = {};
  for (const c of course.cards) results[c.id] = checkCard(c, source);
  for (const q of course.questions) results[q.id] = checkQuestion(q, source);
  return results;
}

function multiset(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function diffNumbers(original: string[], translated: string[]): { missing: string[]; added: string[] } {
  const a = multiset(original);
  const b = multiset(translated);
  const missing: string[] = [];
  const added: string[] = [];
  for (const [k, v] of a) {
    const d = v - (b.get(k) ?? 0);
    for (let i = 0; i < d; i += 1) missing.push(k);
  }
  for (const [k, v] of b) {
    const d = v - (a.get(k) ?? 0);
    for (let i = 0; i < d; i += 1) added.push(k);
  }
  return { missing, added };
}

function cardText(c: Card): string {
  return `${c.title} ${c.body}`;
}

function questionText(q: Question): string {
  return `${q.prompt} ${q.options.join(" ")} ${q.explanation}`;
}

/**
 * Translation check: every number, time and price must survive translation unchanged.
 * A wrong temperature, price or time in a translated procedure is the kind of error
 * nobody on the shop floor will catch.
 */
export function checkTranslation(original: Course, translated: Course): Record<string, string[]> {
  const flags: Record<string, string[]> = {};
  const byId = new Map<string, Card | Question>();
  for (const c of translated.cards) byId.set(c.id, c);
  for (const q of translated.questions) byId.set(q.id, q);

  const compare = (id: string, orig: string, trans: string | undefined) => {
    if (trans === undefined) {
      flags[id] = ["Missing from the translation."];
      return;
    }
    const { missing, added } = diffNumbers(extractNumbers(orig), extractNumbers(trans));
    if (missing.length || added.length) {
      const parts: string[] = [];
      if (missing.length && added.length) parts.push(`${missing.join(", ")} became ${added.join(", ")}`);
      else if (missing.length) parts.push(`${missing.join(", ")} missing`);
      else parts.push(`${added.join(", ")} added`);
      flags[id] = [`Numbers changed in translation: ${parts.join("; ")}.`];
    }
  };

  for (const c of original.cards) {
    const t = byId.get(c.id) as Card | undefined;
    compare(c.id, cardText(c), t ? cardText(t) : undefined);
  }
  for (const q of original.questions) {
    const t = byId.get(q.id) as Question | undefined;
    compare(q.id, questionText(q), t ? questionText(t) : undefined);
  }
  return flags;
}
