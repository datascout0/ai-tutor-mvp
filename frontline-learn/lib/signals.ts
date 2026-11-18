import type { Course } from "./types";

/**
 * "Questions to courses" demo data (all fictional).
 * Signals come from two places a frontline platform already has:
 *  - what associates ask the store assistant (answered, no answer, rated unhelpful)
 *  - which quiz questions they miss on the first try
 * The loop ranks topics, picks the right action for each one (not every question needs a course),
 * drafts a traced refresher where a source exists, targets it in two waves and measures the change.
 */

export const NETWORK = { stores: 48, associates: 1150, windowDays: 14 };

export type SourceStatus = "found" | "missing" | "conflict";
export type Risk = "normal" | "money" | "compliance";

export interface GapSignal {
  id: string;
  topic: string;
  /** What associates actually typed into the assistant. */
  examples: string[];
  questions: number;
  stores: number;
  noAnswer: number;
  lowRated: number;
  /** Share of learners who miss the linked quiz question on the first try (0–1). */
  quizMiss?: number;
  linked?: string;
  source: SourceStatus;
  sourceNote: string;
  risk: Risk;
}

export type ActionKind = "refresher" | "request-source" | "fix-source" | "daily-quiz" | "none";

export const ACTION_LABEL: Record<ActionKind, string> = {
  refresher: "Draft a refresher",
  "request-source": "Ask HQ for a procedure",
  "fix-source": "Fix the source first",
  "daily-quiz": "Add to the daily quiz",
  none: "No training needed",
};

export const SIGNALS: GapSignal[] = [
  {
    id: "returns",
    topic: "Returning shoes the customer has run in",
    examples: [
      "customer ran in aero run 3 for a week can they still return",
      "worn soles refund ok??",
      "return policy running shoes used",
    ],
    questions: 46,
    stores: 19,
    noAnswer: 0,
    lowRated: 15,
    quizMiss: 0.41,
    linked: "Launch day: Aero Run 3 · Q4 (returns)",
    source: "found",
    sourceNote: "Answered by the Aero Run 3 launch sheet.",
    risk: "money",
  },
  {
    id: "click-collect",
    topic: "How long to hold a click & collect order",
    examples: ["how many days do we keep click and collect", "customer hasn't picked up order what now"],
    questions: 31,
    stores: 14,
    noAnswer: 24,
    lowRated: 3,
    source: "missing",
    sourceNote: "No approved document covers this, so the assistant had no answer 24 times.",
    risk: "normal",
  },
  {
    id: "price-match",
    topic: "Matching the online price in store",
    examples: ["online price is lower can i match it", "price match website"],
    questions: 17,
    stores: 9,
    noAnswer: 0,
    lowRated: 8,
    source: "conflict",
    sourceNote: "Two approved documents disagree (2024 pricing policy vs the autumn promo guide), so answers differ.",
    risk: "money",
  },
  {
    id: "wide-fit",
    topic: "Which sizes come in wide fit",
    examples: ["aero run 3 wide fit sizes", "is there a wide version"],
    questions: 22,
    stores: 12,
    noAnswer: 0,
    lowRated: 1,
    quizMiss: 0.06,
    linked: "Launch day: Aero Run 3 · card C3",
    source: "found",
    sourceNote: "Answered by the launch sheet, and associates rate the answers well.",
    risk: "normal",
  },
  {
    id: "drop",
    topic: "What heel-to-toe drop means",
    examples: ["what is drop 8mm", "explain heel drop to customer"],
    questions: 14,
    stores: 8,
    noAnswer: 0,
    lowRated: 2,
    quizMiss: 0.22,
    linked: "Launch day: Aero Run 3 · Q2 (drop)",
    source: "found",
    sourceNote: "Answered by the launch sheet.",
    risk: "normal",
  },
];

const RISK_WEIGHT: Record<Risk, number> = { normal: 1, money: 1.3, compliance: 1.5 };

export function per100(questions: number): number {
  return (questions / NETWORK.associates) * 100;
}

/** Share of questions the assistant didn't resolve: no answer, or rated unhelpful. */
export function unresolvedShare(s: GapSignal): number {
  return (s.noAnswer + s.lowRated) / s.questions;
}

/**
 * Priority = questions per 100 associates × (0.5 + unresolved share) × (1 + quiz miss rate) × risk weight.
 * Simple on purpose: an L&D manager can see why a topic ranks where it does.
 */
export function priority(s: GapSignal): number {
  return per100(s.questions) * (0.5 + unresolvedShare(s)) * (1 + (s.quizMiss ?? 0)) * RISK_WEIGHT[s.risk];
}

/** The rule that picks an action. The AI never drafts training without an approved source. */
export function actionFor(s: GapSignal): ActionKind {
  if (s.source === "missing") return "request-source";
  if (s.source === "conflict") return "fix-source";
  const unresolved = unresolvedShare(s);
  const miss = s.quizMiss ?? 0;
  if (unresolved >= 0.25 || miss >= 0.3) return "refresher";
  if (miss >= 0.15) return "daily-quiz";
  return "none";
}

export const ACTION_WHY: Record<ActionKind, string> = {
  refresher:
    "An approved source answers it, yet associates keep asking, rate the answers poorly and miss the quiz question. The course isn't landing, so draft a short refresher from the source line.",
  "request-source":
    "Nothing approved answers it. Drafting a course would mean the AI inventing a rule, so the right move is to ask HQ for the procedure and draft once it exists.",
  "fix-source":
    "Two approved documents disagree. Training on either would spread the confusion, so the owner of the documents has to settle the rule first.",
  "daily-quiz":
    "The assistant answers it well and the course covers it, but a fifth of learners still miss the question. A repeat in the daily quiz is cheaper than a new course.",
  none: "The assistant answers it well and learners get the question right. People are using the assistant as intended, so no training is needed.",
};

export function rankedSignals(): GapSignal[] {
  return [...SIGNALS].sort((a, b) => priority(b) - priority(a));
}

/** The approved source for the top gap: the same fictional launch sheet used in the main prototype. */
export const REFRESHER_SOURCE_TITLE = "Product launch sheet: Aero Run 3 running shoe";

export const REFRESHER_DIAGNOSIS =
  "In the published course, the returns rule shares card C3 with two other facts (drop and fit), and Q4 on returns is missed first time by 41% of learners.";

/**
 * Pre-generated refresher. Like the main demo, it contains one deliberate failure:
 * card R2 adds a receipt rule that isn't in the launch sheet, so the checks should flag it.
 */
export const REFRESHER_DRAFT: Course = {
  title: "Refresher: returns after running",
  role: "Sales associate",
  language: "en",
  cards: [
    {
      id: "r1",
      title: "Run in them? Still returnable",
      body: "Customers can return Aero Run 3 within 30 days, even if they have run in them. Worn soles are not a reason to refuse.",
      sourceQuote: "Customers can return the shoes within 30 days, even if they have run in them.",
    },
    {
      id: "r2",
      title: "Bring the receipt",
      body: "The customer needs the original receipt to return the shoes.",
      sourceQuote: "Returns need the original receipt.",
    },
  ],
  questions: [
    {
      id: "rq1",
      level: 2,
      prompt: "Day 12. A customer has run in their Aero Run 3 three times and the soles look used. They want to return them. What do you do?",
      options: [
        "Refuse, because they're worn",
        "Accept the return, because it's within 30 days",
        "Offer store credit only",
        "Ask the manager to decide",
      ],
      answerIndex: 1,
      explanation: "Returns are accepted within 30 days, even after running in them.",
      sourceQuote: "Customers can return the shoes within 30 days, even if they have run in them.",
      cardId: "r1",
    },
    {
      id: "rq2",
      level: 3,
      prompt: "Day 35. The customer says \"you take them back even after running\" and asks for a refund. What's right?",
      options: [
        "Accept, because running in them is allowed",
        "Explain that returns are only accepted within 30 days",
        "Accept if they bring the receipt",
        "Offer a free pair of socks instead",
      ],
      answerIndex: 1,
      explanation: "The rule covers running in them, but only within 30 days.",
      sourceQuote: "Customers can return the shoes within 30 days, even if they have run in them.",
      cardId: "r1",
    },
  ],
};

/** Staggered rollout among the stores that asked, so the second wave is the comparison. */
export const WAVES = {
  wave1: { stores: 10, associates: 243 },
  wave2: { stores: 9, associates: 221, delayDays: 7 },
};

/** Simulated results, 7 days after wave 1 starts. Clearly labelled as simulated in the UI. */
export const RESULTS = {
  questionsPer100: {
    wave1: { before: 4.2, after: 1.1 },
    wave2: { before: 3.8, after: 3.3 },
  },
  firstTryCorrect: {
    wave1: { before: 59, after: 87 },
    wave2: { before: 60, after: 62 },
  },
  lowRatedShare: { wave1: { before: 33, after: 9 } },
};
