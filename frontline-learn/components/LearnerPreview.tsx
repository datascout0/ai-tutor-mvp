"use client";

import { useMemo, useState } from "react";
import { Award, BookOpen, ChevronLeft, ChevronRight, Quote, RotateCcw } from "lucide-react";
import { nextLevel, pickQuestion, quizLength, scoreQuiz, START_LEVEL, type AnswerLog } from "@/lib/adaptive";
import { LANG_SHORT, UI } from "@/lib/i18n";
import type { Course, Lang, Level } from "@/lib/types";

interface Props {
  courses: Partial<Record<Lang, Course>>;
  languages: Lang[];
}

type Phase = "cards" | "quiz" | "result";

export default function LearnerPreview({ courses, languages }: Props) {
  const [lang, setLang] = useState<Lang>(languages[0] ?? "en");
  const course = courses[lang] ?? courses.en!;
  const t = UI[lang];

  const [phase, setPhase] = useState<Phase>("cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [showQuote, setShowQuote] = useState(false);

  const [level, setLevel] = useState<Level>(START_LEVEL);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [log, setLog] = useState<AnswerLog[]>([]);

  const pool = course.questions;
  const total = quizLength(pool);
  const current = useMemo(() => pool.find((q) => q.id === currentId) ?? null, [pool, currentId]);
  const result = useMemo(() => scoreQuiz(log), [log]);

  const startQuiz = () => {
    const first = pickQuestion(pool, new Set(), START_LEVEL, null);
    setLevel(START_LEVEL);
    setAskedIds(first ? [first.id] : []);
    setCurrentId(first?.id ?? null);
    setSelected(null);
    setChecked(false);
    setLog([]);
    setPhase("quiz");
  };

  const check = () => {
    if (selected === null || !current) return;
    const correct = selected === current.answerIndex;
    setChecked(true);
    setLog((l) => [...l, { questionId: current.id, level: current.level, correct, cardId: current.cardId }]);
  };

  const advance = () => {
    if (!current) return;
    const last = log[log.length - 1];
    if (log.length >= total) {
      setPhase("result");
      return;
    }
    const newLevel = nextLevel(level, last?.correct ?? false);
    const next = pickQuestion(pool, new Set(askedIds), newLevel, last?.correct ?? null);
    if (!next) {
      setPhase("result");
      return;
    }
    setLevel(newLevel);
    setAskedIds((a) => [...a, next.id]);
    setCurrentId(next.id);
    setSelected(null);
    setChecked(false);
  };

  const reviewCard = (cardId: string) => {
    const idx = course.cards.findIndex((c) => c.id === cardId);
    setCardIndex(Math.max(0, idx));
    setShowQuote(false);
    setPhase("cards");
  };

  const card = course.cards[cardIndex];

  return (
    <div className="mx-auto w-[360px]">
      <div className="rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
        <div className="phone-scroll flex h-[680px] flex-col overflow-y-auto rounded-[1.9rem] bg-white">
          {/* App bar */}
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-wide text-slate-400">{course.role}</p>
                <p className="truncate text-sm font-semibold">{course.title}</p>
              </div>
              <div className="flex rounded-full bg-slate-100 p-0.5" role="group" aria-label="Language">
                {languages.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lang === l ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
                    aria-pressed={lang === l}
                  >
                    {LANG_SHORT[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {phase === "cards" && card && (
            <div className="flex flex-1 flex-col px-4 py-4">
              <div className="mb-3 flex gap-1">
                {course.cards.map((c, i) => (
                  <div key={c.id} className={`h-1 flex-1 rounded-full ${i <= cardIndex ? "bg-indigo-500" : "bg-slate-200"}`} />
                ))}
              </div>
              <p className="text-xs font-medium text-indigo-600">
                {t.lesson} {cardIndex + 1} {t.of} {course.cards.length}
              </p>
              <div className="mt-3 flex-1 rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-5 ring-1 ring-indigo-100">
                <BookOpen className="h-6 w-6 text-indigo-500" />
                <h3 className="mt-3 text-xl font-bold leading-tight">{card.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{card.body}</p>
                <button
                  onClick={() => setShowQuote((s) => !s)}
                  className="mt-5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                >
                  <Quote className="h-3 w-3" /> {t.fromProcedure}
                </button>
                {showQuote && <p className="mt-2 text-xs italic text-slate-500">“{card.sourceQuote}”</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setCardIndex((i) => Math.max(0, i - 1));
                    setShowQuote(false);
                  }}
                  disabled={cardIndex === 0}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-600 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> {t.back}
                </button>
                {cardIndex < course.cards.length - 1 ? (
                  <button
                    onClick={() => {
                      setCardIndex((i) => i + 1);
                      setShowQuote(false);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white"
                  >
                    {t.next} <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={startQuiz}
                    disabled={pool.length === 0}
                    className="flex-1 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {t.startQuiz}
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === "quiz" && current && (
            <div className="flex flex-1 flex-col px-4 py-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-indigo-600">
                  {t.quiz} · {t.question} {log.length + (checked ? 0 : 1)} {t.of} {total}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600" data-testid="quiz-level">
                  {t.levelNames[current.level - 1]}
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-snug">{current.prompt}</p>
              <div className="mt-4 space-y-2">
                {current.options.map((o, i) => {
                  const isAnswer = i === current.answerIndex;
                  const isSelected = i === selected;
                  let cls = "border-slate-200 bg-white";
                  if (!checked && isSelected) cls = "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300";
                  if (checked && isAnswer) cls = "border-emerald-400 bg-emerald-50";
                  if (checked && isSelected && !isAnswer) cls = "border-rose-300 bg-rose-50";
                  return (
                    <button
                      key={i}
                      disabled={checked}
                      onClick={() => setSelected(i)}
                      className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${cls}`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>

              {checked && (
                <div
                  className={`mt-4 rounded-xl p-3 text-sm ${log[log.length - 1]?.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
                >
                  <p className="font-semibold">{log[log.length - 1]?.correct ? t.correct : t.notQuite}</p>
                  <p className="mt-1">{current.explanation}</p>
                  <p className="mt-2 text-xs italic opacity-80">
                    {t.fromProcedure}: “{current.sourceQuote}”
                  </p>
                </div>
              )}

              <div className="mt-auto pt-4">
                {!checked ? (
                  <button
                    onClick={check}
                    disabled={selected === null}
                    className="w-full rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {t.check}
                  </button>
                ) : (
                  <button onClick={advance} className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white">
                    {log.length >= total ? t.seeResult : t.continue}
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === "result" && (
            <div className="flex flex-1 flex-col px-4 py-6 text-center">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${result.ready ? "bg-emerald-100" : "bg-amber-100"}`}
              >
                <Award className={`h-10 w-10 ${result.ready ? "text-emerald-600" : "text-amber-600"}`} />
              </div>
              <h3 className="mt-4 text-xl font-bold" data-testid="result-title">
                {result.ready ? t.readyTitle : t.reviewTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t.score}: {result.correct}/{result.total}
              </p>
              <p className="mt-3 text-sm text-slate-700">{result.ready ? t.readyBody : t.reviewBody}</p>
              {!result.ready && (
                <div className="mt-3 space-y-2 text-left">
                  {result.cardsToReview.map((id) => {
                    const c = course.cards.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => reviewCard(id)}
                        className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{c.title}</span>
                        <ChevronRight className="h-4 w-4 text-amber-600" />
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-auto space-y-2 pt-6">
                <button onClick={startQuiz} className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white">
                  <RotateCcw className="h-4 w-4" /> {t.retake}
                </button>
                <button
                  onClick={() => {
                    setCardIndex(0);
                    setPhase("cards");
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-600"
                >
                  {t.restart}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
