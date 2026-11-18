export type Lang = "en" | "fr" | "es";
export type Level = 1 | 2 | 3;

export interface Card {
  id: string;
  title: string;
  body: string;
  /** Sentence copied from the source procedure. Used to trace every AI line back to the source. */
  sourceQuote: string;
}

export interface Question {
  id: string;
  level: Level;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  sourceQuote: string;
  /** The lesson card this question checks, so a wrong answer can point back to it. */
  cardId: string;
}

export interface Course {
  title: string;
  role: string;
  language: Lang;
  cards: Card[];
  questions: Question[];
}

export type ItemKind = "card" | "question";

export interface CheckResult {
  itemId: string;
  kind: ItemKind;
  grounded: boolean;
  /** Plain-language reasons shown to the manager. Empty when the item passed every check. */
  reasons: string[];
  /** Best-matching source sentence, shown next to the item in review. */
  matchedSentence?: string;
  matchScore: number;
}

export type ReviewStatus = "auto-approved" | "needs-review" | "approved" | "edited" | "removed";

export interface ReviewState {
  status: ReviewStatus;
  reasons: string[];
  note?: string;
}

export interface Sample {
  id: string;
  label: string;
  role: string;
  sourceTitle: string;
  sourceText: string;
}

export interface GenerateResponse {
  course: Course;
  mode: "live" | "demo";
  model?: string;
  generationMs: number;
}

export interface TranslateResponse {
  course: Course;
  mode: "live" | "demo";
  model?: string;
}
