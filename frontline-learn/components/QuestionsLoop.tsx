"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  MessageSquareText,
  Quote,
  Send,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import ItemRow from "@/components/ItemRow";
import { checkCourse, splitSentences } from "@/lib/grounding";
import { SAMPLES } from "@/lib/samples";
import {
  ACTION_LABEL,
  ACTION_WHY,
  actionFor,
  NETWORK,
  per100,
  priority,
  rankedSignals,
  REFRESHER_DIAGNOSIS,
  REFRESHER_DRAFT,
  REFRESHER_SOURCE_TITLE,
  RESULTS,
  unresolvedShare,
  WAVES,
  type ActionKind,
  type GapSignal,
} from "@/lib/signals";
import type { Card, Question, ReviewState } from "@/lib/types";

type Step = "signals" | "refresher" | "target" | "measure";
type Patch = Partial<Card> | Partial<Question>;

const SOURCE_TEXT = SAMPLES.find((s) => s.id === "aero-run-launch")!.sourceText;

const ACTION_STYLE: Record<ActionKind, string> = {
  refresher: "bg-indigo-600 text-white ring-indigo-600",
  "request-source": "bg-amber-50 text-amber-900 ring-amber-300",
  "fix-source": "bg-rose-50 text-rose-800 ring-rose-200",
  "daily-quiz": "bg-sky-50 text-sky-800 ring-sky-200",
  none: "bg-slate-100 text-slate-600 ring-slate-200",
};

const SOURCE_LABEL: Record<GapSignal["source"], { label: string; cls: string }> = {
  found: { label: "Source found", cls: "text-emerald-700" },
  missing: { label: "No approved source", cls: "text-amber-700" },
  conflict: { label: "Sources disagree", cls: "text-rose-700" },
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function QuestionsLoop() {
  const [step, setStep] = useState<Step>("signals");
  const [openId, setOpenId] = useState<string | null>("returns");

  const checks = useMemo(() => checkCourse(REFRESHER_DRAFT, SOURCE_TEXT), []);
  const [review, setReview] = useState<Record<string, ReviewState>>(() => {
    const r: Record<string, ReviewState> = {};
    for (const [id, c] of Object.entries(checks)) {
      r[id] = c.grounded ? { status: "auto-approved", reasons: [] } : { status: "needs-review", reasons: c.reasons };
    }
    return r;
  });
  const [edits, setEdits] = useState<Record<string, Patch>>({});
  const [approved, setApproved] = useState(false);
  const [foldBack, setFoldBack] = useState(true);
  const [sent, setSent] = useState(false);

  const ranked = rankedSignals();
  const totalQuestions = ranked.reduce((n, s) => n + s.questions, 0);
  const needCourse = ranked.filter((s) => actionFor(s) === "refresher").length;

  const allIds = [...REFRESHER_DRAFT.cards.map((c) => c.id), ...REFRESHER_DRAFT.questions.map((q) => q.id)];
  const unresolved = allIds.filter((id) => review[id]?.status === "needs-review").length;
  const traced = allIds.filter((id) => checks[id]?.grounded).length;

  const setStatus = (id: string, status: ReviewState["status"]) => setReview((r) => ({ ...r, [id]: { ...r[id], status } }));
  const restore = (id: string) =>
    setReview((r) => ({
      ...r,
      [id]: checks[id]?.grounded ? { status: "auto-approved", reasons: [] } : { status: "needs-review", reasons: checks[id]?.reasons ?? [] },
    }));
  const saveEdit = (id: string, patch: Patch) => {
    setEdits((e) => ({ ...e, [id]: { ...(e[id] ?? {}), ...patch } }));
    setReview((r) => ({ ...r, [id]: { status: "edited", reasons: [] } }));
  };

  const steps = [
    { key: "signals", label: "What staff ask", short: "Signals", icon: MessageSquareText, enabled: true },
    { key: "refresher", label: "Traced refresher", short: "Refresher", icon: ShieldCheck, enabled: true },
    { key: "target", label: "Target in two waves", short: "Target", icon: Send, enabled: approved },
    { key: "measure", label: "Measure", short: "Measure", icon: BarChart3, enabled: sent },
  ] as const;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">From the questions staff ask to the training they need</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Questions to the store assistant and missed quiz answers show where training isn&apos;t landing. This ranks those topics, picks
          the right action for each one, drafts a traced refresher only where an approved source exists, and measures whether it worked.
        </p>
      </div>

      <ol className="mb-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.key}>
            <button
              onClick={() => s.enabled && setStep(s.key)}
              disabled={!s.enabled}
              className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left sm:px-3 ${
                step === s.key ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              data-testid={`loop-step-${s.key}`}
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

      {step === "signals" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric icon={MessageSquareText} label="Questions to the assistant" value={String(totalQuestions)} sub={`last ${NETWORK.windowDays} days, on these topics`} />
            <Metric icon={Store} label="Network" value={`${NETWORK.stores} stores`} sub={`${NETWORK.associates.toLocaleString("en-GB")} associates`} />
            <Metric icon={FileQuestion} label="Topics found" value={String(ranked.length)} sub="grouped by meaning, ranked by priority" />
            <Metric icon={ClipboardCheck} label="Need a new course" value={`${needCourse} of ${ranked.length}`} sub="the rest need a different fix" tone="ok" />
          </div>

          <div className="space-y-3">
            {ranked.map((s, i) => {
              const action = actionFor(s);
              const open = openId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${action === "refresher" ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}
                  data-testid={`signal-${s.id}`}
                >
                  <button className="w-full text-left" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{s.topic}</p>
                          <p className="mt-0.5 text-sm italic text-slate-500">“{s.examples[0]}”</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ACTION_STYLE[action]}`}>
                        {ACTION_LABEL[action]}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-5">
                      <Stat label="Questions" value={`${s.questions} · ${per100(s.questions).toFixed(1)} per 100`} />
                      <Stat label="Stores asking" value={`${s.stores} of ${NETWORK.stores}`} />
                      <Stat label="Assistant didn't resolve" value={pct(unresolvedShare(s))} hint={s.noAnswer ? `${s.noAnswer} no answer` : `${s.lowRated} rated unhelpful`} />
                      <Stat label="Quiz missed first try" value={s.quizMiss !== undefined ? pct(s.quizMiss) : "no quiz yet"} />
                      <Stat label="Source" value={SOURCE_LABEL[s.source].label} valueCls={SOURCE_LABEL[s.source].cls} />
                    </dl>
                  </button>
                  {open && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-700">
                      <p>
                        <span className="font-medium">Why this action: </span>
                        {ACTION_WHY[action]}
                      </p>
                      <p className="text-slate-500">{s.sourceNote}</p>
                      {s.examples.length > 1 && (
                        <p className="text-slate-500">
                          Also asked: {s.examples.slice(1).map((e) => `“${e}”`).join(" · ")}
                        </p>
                      )}
                      {s.linked && <p className="text-slate-500">Linked training: {s.linked}</p>}
                      <p className="text-xs text-slate-400">Priority score {priority(s).toFixed(2)}</p>
                      {action === "refresher" && (
                        <button
                          onClick={() => setStep("refresher")}
                          className="mt-1 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                          data-testid="open-refresher"
                        >
                          Draft the refresher <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            Priority = questions per 100 associates × (0.5 + share the assistant didn&apos;t resolve) × (1 + quiz miss rate) × 1.3 if a
            mistake costs money. Deliberately simple, so an L&amp;D manager can see why a topic ranks where it does.
          </p>
        </div>
      )}

      {step === "refresher" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={ShieldCheck} label="Traced to source" value={`${traced} / ${allIds.length}`} sub="items matched to a line in the launch sheet" />
            <Metric
              icon={ClipboardCheck}
              label="Needs review"
              value={String(unresolved)}
              sub={unresolved ? "resolve before sending" : "nothing blocking"}
              tone={unresolved ? "warn" : "ok"}
            />
            <Metric icon={Users} label="Will go to" value={`${WAVES.wave1.stores + WAVES.wave2.stores} stores`} sub="only the stores that asked" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <section className="space-y-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
                <span className="font-medium">Why people are asking: </span>
                {REFRESHER_DIAGNOSIS}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved source</p>
                <p className="mt-1 font-medium">{REFRESHER_SOURCE_TITLE}</p>
                <ul className="mt-2 space-y-1">
                  {splitSentences(SOURCE_TEXT).map((line, i) => {
                    const used = REFRESHER_DRAFT.cards.some((c) => c.sourceQuote === line) || REFRESHER_DRAFT.questions.some((q) => q.sourceQuote === line);
                    return (
                      <li
                        key={i}
                        className={`rounded px-1.5 py-0.5 ${used ? "bg-amber-100 font-medium text-slate-900" : "text-slate-500"}`}
                      >
                        {used && <Quote className="mr-1 inline h-3 w-3 text-amber-600" />}
                        {line}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <input type="checkbox" className="mt-1" checked={foldBack} onChange={(e) => setFoldBack(e.target.checked)} />
                <span>
                  <span className="font-medium">Also fix the main course:</span> split card C3 so the returns rule gets its own card, and new
                  hires don&apos;t hit the same gap.
                </span>
              </label>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Refresher draft · 2 cards, 2 questions</h2>
                {approved ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Approved
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (unresolved > 0) return;
                      setApproved(true);
                      setStep("target");
                    }}
                    disabled={unresolved > 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    data-testid="approve-refresher"
                  >
                    {unresolved > 0 ? `Resolve ${unresolved} item${unresolved > 1 ? "s" : ""} to approve` : "Approve refresher"}
                  </button>
                )}
              </div>
              {REFRESHER_DRAFT.cards.map((c) => (
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
              {REFRESHER_DRAFT.questions.map((q) => (
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
            </section>
          </div>
        </div>
      )}

      {step === "target" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <p className="font-medium text-slate-900">Who gets it: sales associates in the 19 stores that asked about returns.</p>
            <p className="mt-1">
              It goes out with the next returns-desk checklist, so it arrives when it&apos;s needed.{" "}
              {foldBack && "Card C3 in the main course is split too, so new hires get the returns rule on its own card."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <WaveCard
              title="Wave 1 · now"
              swatch="#2a78d6"
              stores={WAVES.wave1.stores}
              associates={WAVES.wave1.associates}
              note="Gets the refresher today."
            />
            <WaveCard
              title={`Wave 2 · in ${WAVES.wave2.delayDays} days`}
              swatch="#eb6834"
              stores={WAVES.wave2.stores}
              associates={WAVES.wave2.associates}
              note="Gets it a week later, and is the comparison group until then."
            />
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
            <span className="font-medium">Why two waves: </span>
            questions can drop on their own (launch week ends, word spreads in the store). Comparing wave 1 with wave 2 over the same week
            separates the refresher&apos;s effect from that, and every store still gets it within 7 days.
          </div>
          {!sent ? (
            <button
              onClick={() => {
                setSent(true);
                setStep("measure");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              data-testid="send-wave1"
            >
              <Send className="h-4 w-4" /> Send to wave 1
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Sent to wave 1
            </span>
          )}
        </div>
      )}

      {step === "measure" && <MeasureStep />}
    </main>
  );
}

function MeasureStep() {
  const q = RESULTS.questionsPer100;
  const drop1 = q.wave1.before - q.wave1.after;
  const drop2 = q.wave2.before - q.wave2.after;
  const effect = drop1 - drop2;
  const c = RESULTS.firstTryCorrect;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <span className="font-medium">Simulated results</span>, 7 days after wave 1. They show what the readout would look like, not real data.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Questions about returns, per 100 associates</h2>
          <p className="text-xs text-slate-500">Week before vs week after wave 1 was sent</p>
          <WaveBars />
          <p className="mt-3 text-sm text-slate-700">
            Wave 1 fell by {drop1.toFixed(1)}, wave 2 by {drop2.toFixed(1)}. So about{" "}
            <span className="font-semibold">{effect.toFixed(1)} fewer questions per 100 associates</span> are down to the refresher, not to
            the week.
          </p>
        </section>

        <section className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <caption className="px-3 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">All three signals</caption>
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Signal</th>
                  <th className="px-3 py-2 text-right font-medium">Wave 1</th>
                  <th className="px-3 py-2 text-right font-medium">Wave 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2">Questions per 100 associates</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {q.wave1.before} → {q.wave1.after}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {q.wave2.before} → {q.wave2.after}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Returns question right first try</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.wave1.before}% → {c.wave1.after}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.wave2.before}% → {c.wave2.after}%
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Assistant answers rated unhelpful</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {RESULTS.lowRatedShare.wave1.before}% → {RESULTS.lowRatedShare.wave1.after}%
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">not yet sent</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <p className="font-medium">Decision</p>
            <p className="mt-1">
              Send to wave 2, keep the split card in the main course and close the topic. Re-open it automatically if questions climb back
              above 2 per 100 associates.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">With real data, I&apos;d check</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Rates per 100 associates, because store sizes differ.</li>
              <li>The waves were similar before (here 4.2 vs 3.8), so the comparison is fair.</li>
              <li>At least a full week per wave, because weekends change who works and what customers ask.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Grouped bars: before/after for each wave. Values are labelled, a legend sits above, each bar has a hover tooltip. */
function WaveBars() {
  const [hover, setHover] = useState<string | null>(null);
  const q = RESULTS.questionsPer100;
  const series = [
    { key: "wave1", label: "Wave 1 (got the refresher)", color: "#2a78d6", values: [q.wave1.before, q.wave1.after] },
    { key: "wave2", label: "Wave 2 (not yet)", color: "#eb6834", values: [q.wave2.before, q.wave2.after] },
  ];
  const groups = ["Week before", "Week after"];
  const W = 420;
  const H = 220;
  const pad = { l: 28, r: 8, t: 22, b: 28 };
  const max = 5;
  const plotH = H - pad.t - pad.b;
  const groupW = (W - pad.l - pad.r) / groups.length;
  const barW = 56;
  const gap = 2;
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;

  const barPath = (x: number, top: number, w: number, bottom: number, r = 4) => {
    const h = bottom - top;
    const rr = Math.min(r, h / 2, w / 2);
    return `M${x},${bottom} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + w - rr},${top} Q${x + w},${top} ${x + w},${top + rr} L${x + w},${bottom} Z`;
  };

  const hovered = hover ? hover.split(":") : null;
  const tip = hovered ? series.find((s) => s.key === hovered[0]) : null;
  const tipIdx = hovered ? Number(hovered[1]) : 0;

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600" aria-hidden>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Questions per 100 associates, before and after, by wave">
          {[0, 1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c3c2b7" : "#e1e0d9"} strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {t}
              </text>
            </g>
          ))}
          {groups.map((g, gi) => {
            const gx = pad.l + gi * groupW + groupW / 2;
            const totalW = series.length * barW + (series.length - 1) * gap;
            return (
              <g key={g}>
                {series.map((s, si) => {
                  const x = gx - totalW / 2 + si * (barW + gap);
                  const v = s.values[gi];
                  const id = `${s.key}:${gi}`;
                  const dim = hover && hover !== id;
                  return (
                    <g key={s.key}>
                      <path d={barPath(x, y(v), barW, y(0))} fill={s.color} opacity={dim ? 0.45 : 1} />
                      <text x={x + barW / 2} y={y(v) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">
                        {v.toFixed(1)}
                      </text>
                      <rect
                        x={x - 4}
                        y={pad.t}
                        width={barW + 8}
                        height={plotH}
                        fill="transparent"
                        onMouseEnter={() => setHover(id)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(id)}
                        onBlur={() => setHover(null)}
                        tabIndex={0}
                        aria-label={`${s.label}, ${g}: ${v.toFixed(1)} per 100 associates`}
                      />
                    </g>
                  );
                })}
                <text x={gx} y={H - 8} textAnchor="middle" fontSize="11" fill="#475569">
                  {g}
                </text>
              </g>
            );
          })}
        </svg>
        {tip && (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow">
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tip.color }} />
              {tip.label}
            </div>
            <div className="text-slate-600">
              {groups[tipIdx]}: <span className="font-semibold text-slate-900">{tip.values[tipIdx].toFixed(1)}</span> per 100 associates
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WaveCard({ title, swatch, stores, associates, note }: { title: string; swatch: string; stores: number; associates: number; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 font-semibold">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: swatch }} />
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold">{stores} stores</p>
      <p className="text-sm text-slate-500">{associates} sales associates</p>
      <p className="mt-2 text-sm text-slate-700">{note}</p>
    </div>
  );
}

function Stat({ label, value, hint, valueCls }: { label: string; value: string; hint?: string; valueCls?: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${valueCls ?? "text-slate-900"}`}>
        {value}
        {hint && <span className="block font-normal text-slate-500">{hint}</span>}
      </dd>
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
    <div className={`rounded-xl border bg-white p-3 ${tone === "warn" ? "border-amber-300" : tone === "ok" ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}
