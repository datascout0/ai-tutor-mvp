import type { Level, Question } from "./types";

export const QUIZ_LENGTH = 5;
export const START_LEVEL: Level = 2;

export function quizLength(pool: Question[]): number {
  return Math.min(QUIZ_LENGTH, pool.length);
}

export function nextLevel(level: Level, correct: boolean): Level {
  if (correct) return Math.min(3, level + 1) as Level;
  return Math.max(1, level - 1) as Level;
}

/**
 * Pick the next unasked question at the target level.
 * If that level is used up, take the nearest level, leaning up after a right answer
 * and down after a wrong one.
 */
export function pickQuestion(
  pool: Question[],
  askedIds: Set<string>,
  target: Level,
  lastCorrect: boolean | null,
): Question | null {
  const remaining = pool.filter((q) => !askedIds.has(q.id));
  if (remaining.length === 0) return null;
  const atTarget = remaining.find((q) => q.level === target);
  if (atTarget) return atTarget;
  const preferUp = lastCorrect !== false;
  for (const distance of [1, 2]) {
    const first = (preferUp ? target + distance : target - distance) as Level;
    const second = (preferUp ? target - distance : target + distance) as Level;
    const a = remaining.find((q) => q.level === first);
    if (a) return a;
    const b = remaining.find((q) => q.level === second);
    if (b) return b;
  }
  return remaining[0];
}

export interface AnswerLog {
  questionId: string;
  level: Level;
  correct: boolean;
  cardId: string;
}

export interface QuizResult {
  correct: number;
  total: number;
  ready: boolean;
  cardsToReview: string[];
  highestLevelCorrect: Level | 0;
}

export function scoreQuiz(log: AnswerLog[]): QuizResult {
  const correct = log.filter((a) => a.correct).length;
  const total = log.length;
  const cardsToReview = Array.from(new Set(log.filter((a) => !a.correct).map((a) => a.cardId)));
  const highestLevelCorrect = log.filter((a) => a.correct).reduce<Level | 0>((m, a) => (a.level > m ? a.level : m), 0);
  return {
    correct,
    total,
    ready: total > 0 && correct / total >= 0.8,
    cardsToReview,
    highestLevelCorrect,
  };
}
