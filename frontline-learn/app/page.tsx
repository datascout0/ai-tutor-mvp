"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Languages, Loader2, ShieldCheck, Smartphone, Timer } from "lucide-react";
import Header from "@/components/Header";
import ItemRow from "@/components/ItemRow";
import LearnerPreview from "@/components/LearnerPreview";
import SourceStep from "@/components/SourceStep";
import { checkCourse, checkTranslation } from "@/lib/grounding";
import { LANG_LABEL } from "@/lib/i18n";
import { SAMPLES } from "@/lib/samples";
import type {
  Card,
  CheckResult,
  Course,
  GenerateResponse,
  Lang,
  Question,
  ReviewState,
  TranslateResponse,
} from "@/lib/types";

type Step = "source" | "review" | "learner";
type Patch = Partial<Card> | Partial<Question>;

interface TranslationState {
  course?: Course;
  review: Record<string, ReviewState>;
  edits: Record<string, Patch>;
  approved: boolean;
  loading: boolean;
  error?: string;
}

const RESOLVED: ReviewState["status"][] = ["auto-approved", "approved", "edited", "removed"];

function formatDuration(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${s % 60} s`;
}

/** Apply manager edits and drop removed items. */
function applyReview(course: Course, review: Record<string, ReviewState>, edits: Record<string, Patch>): Course {
  return {
    ...course,
    cards: course.cards.filter((c) => review[c.id]?.status !== "removed").map((c) => ({ ...c, ...(edits[c.id] as Partial<Card>) })),
    questions: course.questions
      .filter((q) => review[q.id]?.status !== "removed")
      .map((q) => ({ ...q, ...(edits[q.id] as Partial<Question>) })),
  };
}

function initialReview(checks: Record<string, CheckResult>): Record<string, ReviewState> {
  const r: Record<string, ReviewState> = {};
  for (const [id, c] of Object.entries(checks)) {
    r[id] = c.grounded ? { status: "auto-approved", reasons: [] } : { status: "needs-review", reasons: c.reasons };
  }
  return r;
}

export default function Page() {
  const [step, setStep] = useState<Step>("source");
  const [sampleId, setSampleId] = useState<string | null>(SAMPLES[0].id);
  const [sourceText, setSourceText] = useState(SAMPLES[0].sourceText);
  const [role, setRole] = useState(SAMPLES[0].role);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [review, setReview] = useState<Record<string, ReviewState>>({});
  const [edits, setEdits] = useState<Record<string, Patch>>({});
  const [genInfo, setGenInfo] = useState<{ mode: "demo" | "live"; model?: string; ms: number; startedAt: number } | null>(null);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);

  const [reviewLang, setReviewLang] = useState<Lang>("en");
  const [translations, setTranslations] = useState<Partial<Record<"fr" | "es", TranslationState>>>({});

  const reviewedCourse = useMemo(() => (course ? applyReview(course, review, edits) : null), [course, review, edits]);
  const allIds = course ? [...course.cards.map((c) => c.id), ...course.questions.map((q) => q.id)] : [];
  const unresolved = allIds.filter((id) => review[id]?.status === "needs-review").length;
  const traced = allIds.filter((id) => checks[id]?.grounded).length;
  const published = publishedAt !== null;

  const learnerCourses = useMemo(() => {
    const out: Partial<Record<Lang, Course>> = {};
    if (reviewedCourse && published) out.en = reviewedCourse;
    for (const lang of ["fr", "es"] as const) {
      const t = translations[lang];
      if (t?.approved && t.course) out[lang] = applyReview(t.course, t.review, t.edits);
    }
    return out;
  }, [reviewedCourse, published, translations]);
  const learnerLangs = (["en", "fr", "es"] as Lang[]).filter((l) => learnerCourses[l]);

  const pickSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id)!;
    setSampleId(id);
    setSourceText(s.sourceText);
    setRole(s.role);
    setError(null);
    setHint(null);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    const startedAt = Date.now();
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, sampleId, role }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Generation failed");
        setHint(data.hint ?? null);
        return;
      }
      const g = data as GenerateResponse;
      const c = checkCourse(g.course, sourceText);
      setCourse(g.course);
      setChecks(c);
      setReview(initialReview(c));
      setEdits({});
      setTranslations({});
      setPublishedAt(null);
      setReviewLang("en");
      setGenInfo({ mode: g.mode, model: g.model, ms: g.generationMs, startedAt });
      setStep("review");
    } catch {
      setError("Couldn't reach the generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id: string, status: ReviewState["status"]) =>
    setReview((r) => ({ ...r, [id]: { ...r[id], status, reasons: status === "removed" ? r[id].reasons : r[id].reasons } }));

  const restore = (id: string) =>
    setReview((r) => ({ ...r, [id]: checks[id]?.grounded ? { status: "auto-approved", reasons: [] } : { status: "needs-review", reasons: checks[id]?.reasons ?? [] } }));

  const saveEdit = (id: string, patch: Patch) => {
    setEdits((e) => ({ ...e, [id]: { ...(e[id] ?? {}), ...patch } }));
    setReview((r) => ({ ...r, [id]: { status: "edited", reasons: [] } }));
  };

  const publish = () => {
    if (unresolved > 0) return;
    setPublishedAt(Date.now());
  };

  const translate = async (lang: "fr" | "es") => {
    if (!reviewedCourse) return;
    setTranslations((t) => ({ ...t, [lang]: { review: {}, edits: {}, approved: false, loading: true } }));
    try {
      const unchangedSample = SAMPLES.find((s) => s.id === sampleId)?.sourceText.trim() === sourceText.trim();
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: reviewedCourse, target: lang, sampleId: unchangedSample ? sampleId : null }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setTranslations((t) => ({ ...t, [lang]: { review: {}, edits: {}, approved: false, loading: false, error: data.error } }));
        return;
      }
      const tr = data as TranslateResponse;
      let translated = tr.course;
      const flags = checkTranslation(reviewedCourse, translated);

      // Demo translations are pre-written, so items the manager edited in English
      // would be out of date. Show the edited English text and flag it for a translator.
      if (tr.mode === "demo") {
        const editedIds = Object.keys(edits).filter((id) => review[id]?.status === "edited");
        if (editedIds.length) {
          translated = {
            ...translated,
            cards: translated.cards.map((c) => (editedIds.includes(c.id) ? reviewedCourse.cards.find((x) => x.id === c.id) ?? c : c)),
            questions: translated.questions.map((q) =>
              editedIds.includes(q.id) ? reviewedCourse.questions.find((x) => x.id === q.id) ?? q : q,
            ),
          };
          for (const id of editedIds) flags[id] = ["Edited in English after generation, so this still needs translating."];
        }
      }

      const tReview: Record<string, ReviewState> = {};
      for (const item of [...translated.cards, ...translated.questions]) {
        tReview[item.id] = flags[item.id] ? { status: "needs-review", reasons: flags[item.id] } : { status: "auto-approved", reasons: [] };
      }
      setTranslations((t) => ({ ...t, [lang]: { course: translated, review: tReview, edits: {}, approved: false, loading: false } }));
    } catch {
      setTranslations((t) => ({ ...t, [lang]: { review: {}, edits: {}, approved: false, loading: false, error: "Translation failed" } }));
    }
  };

  const updateTranslation = (lang: "fr" | "es", fn: (t: TranslationState) => TranslationState) =>
    setTranslations((all) => (all[lang] ? { ...all, [lang]: fn(all[lang]!) } : all));

  const tState = reviewLang !== "en" ? translations[reviewLang] : undefined;
  const tUnresolved = tState?.course
    ? [...tState.course.cards, ...tState.course.questions].filter((i) => tState.review[i.id]?.status === "needs-review").length
    : 0;

  return (
    <div>
      <Header active="app" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">From store procedure to shift-ready micro-course</h1>
          <p className="mt-1 max-w-3xl text-slate-600">
            AI drafts the lessons and quiz. Every line is traced back to the source document, anything that isn&apos;t gets flagged, and a
            manager approves before staff see it.
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 grid grid-cols-3 gap-2 text-sm">
          {(
            [
              { key: "source", label: "Source", short: "Source", icon: ClipboardCheck, enabled: true },
              { key: "review", label: "Review & publish", short: "Review", icon: ShieldCheck, enabled: !!course },
              { key: "learner", label: "Learner preview", short: "Learner", icon: Smartphone, enabled: published },
            ] as const
          ).map((s, i) => (
            <li key={s.key}>
              <button
                onClick={() => s.enabled && setStep(s.key)}
                disabled={!s.enabled}
                className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left sm:px-3 ${
                  step === s.key ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                data-testid={`step-${s.key}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold ring-1 ring-slate-200">
                  {i + 1}
                </span>
                <s.icon className="hidden h-4 w-4 sm:block" />
                <span className="font-medium sm:hidden">{s.short}</span>
                <span className="hidden font-medium sm:inline">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>

        {step === "source" && (
          <SourceStep
            sampleId={sampleId}
            sourceText={sourceText}
            role={role}
            loading={loading}
            error={error}
            hint={hint}
            onPickSample={pickSample}
            onChangeText={(t) => {
              setSourceText(t);
              const s = SAMPLES.find((x) => x.id === sampleId);
              if (s && s.sourceText !== t) setSampleId(null);
            }}
            onChangeRole={setRole}
            onGenerate={generate}
          />
        )}

        {step === "review" && course && reviewedCourse && genInfo && (
          <div className="space-y-5">
            {/* Metrics */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric
                icon={Timer}
                label="Draft generated"
                value={formatDuration(genInfo.ms)}
                sub={genInfo.mode === "demo" ? "Demo mode (pre-generated)" : `Live · ${genInfo.model}`}
              />
              <Metric icon={ShieldCheck} label="Traced to source" value={`${traced} / ${allIds.length}`} sub="items matched to a line in the source" />
              <Metric
                icon={ClipboardCheck}
                label="Needs review"
                value={String(unresolved)}
                sub={unresolved ? "resolve before publishing" : "nothing blocking"}
                tone={unresolved ? "warn" : "ok"}
              />
              <Metric
                icon={CheckCircle2}
                label="Time to publish"
                value={published ? formatDuration(publishedAt! - genInfo.startedAt) : "–"}
                sub={published ? "draft + manager review" : "not published yet"}
              />
            </div>

            {/* Language tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-xl bg-slate-100 p-1 text-sm" role="tablist">
                {(["en", "fr", "es"] as Lang[]).map((l) => {
                  const locked = l !== "en" && !published;
                  const t = l !== "en" ? translations[l as "fr" | "es"] : undefined;
                  return (
                    <button
                      key={l}
                      role="tab"
                      aria-selected={reviewLang === l}
                      disabled={locked}
                      onClick={() => setReviewLang(l)}
                      className={`rounded-lg px-3 py-1.5 ${reviewLang === l ? "bg-white font-medium shadow" : "text-slate-600"} disabled:opacity-40`}
                      title={locked ? "Publish the English version first" : undefined}
                      data-testid={`tab-${l}`}
                    >
                      {LANG_LABEL[l]}
                      {l === "en" && published && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                      {t?.approved && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
              {reviewLang === "en" && !published && (
                <button
                  onClick={publish}
                  disabled={unresolved > 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  data-testid="publish"
                >
                  {unresolved > 0 ? `Resolve ${unresolved} item${unresolved > 1 ? "s" : ""} to publish` : "Publish to learners"}
                </button>
              )}
              {published && (
                <button
                  onClick={() => setStep("learner")}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                  data-testid="open-learner"
                >
                  <Smartphone className="h-4 w-4" /> Open learner preview
                </button>
              )}
            </div>

            {published && reviewLang === "en" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Published in English. Add French or Spanish next: translations get their own check, because a changed time or price is
                the kind of error nobody on the shop floor will catch.
              </div>
            )}

            {reviewLang === "en" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Lesson cards</h2>
                  <div className="space-y-3">
                    {course.cards.map((c) => (
                      <ItemRow
                        key={c.id}
                        item={{ ...c, ...(edits[c.id] as Partial<Card>) }}
                        review={review[c.id]}
                        matchedSentence={checks[c.id]?.matchedSentence}
                        onApprove={() => setStatus(c.id, "approved")}
                        onRemove={() => setStatus(c.id, "removed")}
                        onRestore={() => restore(c.id)}
                        onSaveEdit={(p) => saveEdit(c.id, p)}
                      />
                    ))}
                  </div>
                </section>
                <section>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Quiz questions</h2>
                  <div className="space-y-3">
                    {course.questions.map((q) => (
                      <ItemRow
                        key={q.id}
                        item={{ ...q, ...(edits[q.id] as Partial<Question>) }}
                        review={review[q.id]}
                        matchedSentence={checks[q.id]?.matchedSentence}
                        onApprove={() => setStatus(q.id, "approved")}
                        onRemove={() => setStatus(q.id, "removed")}
                        onRestore={() => restore(q.id)}
                        onSaveEdit={(p) => saveEdit(q.id, p)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {reviewLang !== "en" && (
              <TranslationPanel
                lang={reviewLang as "fr" | "es"}
                state={tState}
                original={reviewedCourse}
                unresolved={tUnresolved}
                onTranslate={() => translate(reviewLang as "fr" | "es")}
                onApproveItem={(id) =>
                  updateTranslation(reviewLang as "fr" | "es", (t) => ({ ...t, review: { ...t.review, [id]: { status: "approved", reasons: t.review[id].reasons } } }))
                }
                onSaveEdit={(id, patch) =>
                  updateTranslation(reviewLang as "fr" | "es", (t) => ({
                    ...t,
                    edits: { ...t.edits, [id]: { ...(t.edits[id] ?? {}), ...patch } },
                    review: { ...t.review, [id]: { status: "edited", reasons: [] } },
                  }))
                }
                onApproveAll={() => updateTranslation(reviewLang as "fr" | "es", (t) => ({ ...t, approved: true }))}
              />
            )}
          </div>
        )}

        {step === "learner" && learnerLangs.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="order-2 space-y-4 lg:order-1">
              <h2 className="text-lg font-semibold">What the store associate sees</h2>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="font-medium">5 short cards.</span> Each one can show the exact line of the procedure it came from
                  (&quot;From the procedure&quot;), so staff can trust it.
                </li>
                <li className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="font-medium">An adaptive quick check.</span> It starts at &quot;Apply&quot;, moves up to &quot;Judgement&quot; after a right
                  answer and back to &quot;Recall&quot; after a wrong one.
                </li>
                <li className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="font-medium">A clear result.</span> &quot;Shift-ready&quot; at 80% or more. Otherwise, the exact cards to
                  review, based on the questions missed.
                </li>
                <li className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="font-medium">Languages.</span> Only translations a manager has approved appear in the switcher.
                  {learnerLangs.length === 1 && " Approve French or Spanish in the review step to see them here."}
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <LearnerPreview key={learnerLangs.join("-")} courses={learnerCourses} languages={learnerLangs} />
            </div>
          </div>
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-400">
        Concept prototype with fictional sample documents. Not affiliated with any company.
      </footer>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 ${tone === "warn" ? "border-amber-300" : tone === "ok" ? "border-emerald-200" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function TranslationPanel({
  lang,
  state,
  original,
  unresolved,
  onTranslate,
  onApproveItem,
  onSaveEdit,
  onApproveAll,
}: {
  lang: "fr" | "es";
  state?: TranslationState;
  original: Course;
  unresolved: number;
  onTranslate: () => void;
  onApproveItem: (id: string) => void;
  onSaveEdit: (id: string, patch: Patch) => void;
  onApproveAll: () => void;
}) {
  if (!state || (!state.course && !state.loading)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Languages className="mx-auto h-8 w-8 text-indigo-500" />
        <p className="mt-2 font-medium">Translate the published course into {LANG_LABEL[lang]}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Every number, time and price is compared with the English version. Anything that changed is flagged before staff see it.
        </p>
        {state?.error && <p className="mt-2 text-sm text-rose-700">{state.error}</p>}
        <button
          onClick={onTranslate}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          data-testid={`translate-${lang}`}
        >
          <Languages className="h-4 w-4" /> Translate
        </button>
      </div>
    );
  }
  if (state.loading || !state.course) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Translating…
      </div>
    );
  }
  const t = state.course;
  const origById = new Map<string, Card | Question>([...original.cards.map((c) => [c.id, c] as const), ...original.questions.map((q) => [q.id, q] as const)]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-700">
          <span className="font-medium">{LANG_LABEL[lang]} translation.</span>{" "}
          {unresolved > 0 ? `${unresolved} item${unresolved > 1 ? "s" : ""} need${unresolved > 1 ? "" : "s"} a check before staff see this language.` : "All numbers match the English version."}
        </p>
        {state.approved ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Approved for learners
          </span>
        ) : (
          <button
            onClick={onApproveAll}
            disabled={unresolved > 0}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            data-testid={`approve-${lang}`}
          >
            Approve {LANG_LABEL[lang]}
          </button>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lesson cards</h2>
          {t.cards.map((c) => (
            <ItemRow
              key={c.id}
              item={{ ...c, ...(state.edits[c.id] as Partial<Card>) }}
              review={state.review[c.id]}
              original={origById.get(c.id)}
              allowRemove={false}
              onApprove={() => onApproveItem(c.id)}
              onSaveEdit={(p) => onSaveEdit(c.id, p)}
            />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quiz questions</h2>
          {t.questions.map((q) => (
            <ItemRow
              key={q.id}
              item={{ ...q, ...(state.edits[q.id] as Partial<Question>) }}
              review={state.review[q.id]}
              original={origById.get(q.id)}
              allowRemove={false}
              onApprove={() => onApproveItem(q.id)}
              onSaveEdit={(p) => onSaveEdit(q.id, p)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
