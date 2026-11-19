"use client";

import { FileText, Loader2, Sparkles } from "lucide-react";
import { SAMPLES } from "@/lib/samples";

interface Props {
  sampleId: string | null;
  sourceText: string;
  role: string;
  loading: boolean;
  error: string | null;
  hint: string | null;
  onPickSample: (id: string) => void;
  onChangeText: (text: string) => void;
  onChangeRole: (role: string) => void;
  onGenerate: () => void;
}

export default function SourceStep(p: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1 · Pick a source</h2>
        <p className="text-sm text-slate-600">
          Start from a real store document. Every line the AI writes will be traced back to it.
        </p>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            onClick={() => p.onPickSample(s.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              p.sampleId === s.id ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            data-testid={`sample-${s.id}`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">{s.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{s.sourceTitle}</p>
            <p className="mt-1 text-xs text-slate-500">For: {s.role}</p>
          </button>
        ))}
        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          The two samples use pre-generated output with planted errors, so you can watch the checks catch them. Paste your own procedure
          into the source box to generate live.
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Source document</h2>
            <p className="text-sm text-slate-500">The only facts the course is allowed to use.</p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Learner role</span>
            <input
              value={p.role}
              onChange={(e) => p.onChangeRole(e.target.value)}
              className="w-64 rounded-md border border-slate-300 px-2 py-1.5"
              aria-label="Learner role"
            />
          </label>
        </div>
        <textarea
          value={p.sourceText}
          onChange={(e) => p.onChangeText(e.target.value)}
          rows={16}
          className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed"
          aria-label="Source document"
          placeholder="Paste a store procedure, product sheet or policy…"
        />
        {p.error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            <p className="font-medium">{p.error}</p>
            {p.hint && <p className="mt-1 text-rose-700">{p.hint}</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Creates 5 lesson cards and 6 quiz questions (2 recall, 2 apply, 2 judgement).</p>
          <button
            onClick={p.onGenerate}
            disabled={p.loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            data-testid="generate"
          >
            {p.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {p.loading ? "Generating…" : "Generate course"}
          </button>
        </div>
      </section>
    </div>
  );
}
