"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Quote, Trash2, Undo2 } from "lucide-react";
import type { Card, Question, ReviewState } from "@/lib/types";

type Item = Card | Question;

function isQuestion(item: Item): item is Question {
  return (item as Question).prompt !== undefined;
}

const LEVEL_LABEL = ["", "Recall", "Apply", "Judgement"];

export function StatusBadge({ status }: { status: ReviewState["status"] }) {
  const map: Record<ReviewState["status"], { label: string; cls: string }> = {
    "auto-approved": { label: "Traced to source", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    "needs-review": { label: "Needs review", cls: "bg-amber-50 text-amber-800 ring-amber-300" },
    approved: { label: "Approved by manager", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
    edited: { label: "Edited by manager", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    removed: { label: "Removed", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
  };
  const s = map[status];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.cls}`}>{s.label}</span>;
}

interface Props {
  item: Item;
  review: ReviewState;
  matchedSentence?: string;
  /** English original, shown next to a translated item. */
  original?: Item;
  allowRemove?: boolean;
  onApprove: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
  onSaveEdit: (patch: Partial<Card> | Partial<Question>) => void;
}

export default function ItemRow({ item, review, matchedSentence, original, allowRemove = true, onApprove, onRemove, onRestore, onSaveEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Item>(item);
  const q = isQuestion(item) ? item : null;
  const needs = review.status === "needs-review";
  const removed = review.status === "removed";

  const startEdit = () => {
    setDraft(item);
    setEditing(true);
  };

  const save = () => {
    if (isQuestion(draft)) {
      onSaveEdit({ prompt: draft.prompt, options: draft.options, answerIndex: draft.answerIndex, explanation: draft.explanation });
    } else {
      onSaveEdit({ title: draft.title, body: draft.body });
    }
    setEditing(false);
  };

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        needs ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
      } ${removed ? "opacity-60" : ""}`}
      data-testid={`item-${item.id}`}
      data-status={review.status}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">{item.id.toUpperCase()}</span>
          {q && <span className="rounded bg-slate-100 px-1.5 py-0.5">Level {q.level} · {LEVEL_LABEL[q.level]}</span>}
          {q && <span>checks card {q.cardId.toUpperCase()}</span>}
        </div>
        <StatusBadge status={review.status} />
      </div>

      {!editing && (
        <div className="mt-2">
          {q ? (
            <>
              <p className={`font-medium ${removed ? "line-through" : ""}`}>{q.prompt}</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {q.options.map((o, i) => (
                  <li
                    key={i}
                    className={`rounded-md border px-2 py-1 ${i === q.answerIndex ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-900" : "border-slate-200 text-slate-600"}`}
                  >
                    {i === q.answerIndex && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                    {o}
                  </li>
                ))}
              </ul>
              {q.explanation && <p className="mt-2 text-sm text-slate-600">{q.explanation}</p>}
            </>
          ) : (
            <>
              <p className={`font-semibold ${removed ? "line-through" : ""}`}>{(item as Card).title}</p>
              <p className="mt-1 text-sm text-slate-700">{(item as Card).body}</p>
            </>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          {isQuestion(draft) ? (
            <>
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                aria-label="Question"
              />
              {draft.options.map((o, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`answer-${item.id}`}
                    checked={draft.answerIndex === i}
                    onChange={() => setDraft({ ...draft, answerIndex: i })}
                    aria-label={`Correct answer ${i + 1}`}
                  />
                  <input
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1"
                    value={o}
                    onChange={(e) => {
                      const options = [...draft.options];
                      options[i] = e.target.value;
                      setDraft({ ...draft, options });
                    }}
                    aria-label={`Option ${i + 1}`}
                  />
                </label>
              ))}
              <textarea
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                rows={2}
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                aria-label="Explanation"
              />
            </>
          ) : (
            <>
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                value={(draft as Card).title}
                onChange={(e) => setDraft({ ...(draft as Card), title: e.target.value })}
                aria-label="Card title"
              />
              <textarea
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                rows={3}
                value={(draft as Card).body}
                onChange={(e) => setDraft({ ...(draft as Card), body: e.target.value })}
                aria-label="Card text"
              />
            </>
          )}
          <div className="flex gap-2">
            <button onClick={save} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
              Save edit
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {original && !editing && (
        <p className="mt-2 border-l-2 border-slate-200 pl-2 text-xs text-slate-500">
          <span className="font-medium">English: </span>
          {isQuestion(original) ? original.prompt : `${(original as Card).title}. ${(original as Card).body}`}
        </p>
      )}

      <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
        <div className="flex items-start gap-1.5">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div>
            <span className="font-medium text-slate-700">Source line: </span>
            {item.sourceQuote ? <span className="italic">“{item.sourceQuote}”</span> : <span className="italic">none given</span>}
            {needs && matchedSentence && !original && (
              <div className="mt-1 text-slate-500">
                Closest line in your procedure: <span className="italic">“{matchedSentence}”</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {review.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {review.reasons.map((r, i) => (
            <li key={i} className={`flex items-start gap-1.5 text-sm ${needs ? "text-amber-900" : "text-slate-500"}`}>
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${needs ? "text-amber-500" : "text-slate-400"}`} />
              {needs ? r : `Flag noted: ${r}`}
            </li>
          ))}
        </ul>
      )}

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {needs && (
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve as is
            </button>
          )}
          {!removed && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
          {allowRemove && !removed && onRemove && (
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
          {removed && onRestore && (
            <button
              onClick={onRestore}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Undo2 className="h-4 w-4" /> Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
