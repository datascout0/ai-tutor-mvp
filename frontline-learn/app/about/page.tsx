import Link from "next/link";
import Header from "@/components/Header";

export const metadata = { title: "Why & how · Frontline Learn concept" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function About() {
  return (
    <div>
      <Header active="about" />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div>
          <p className="text-sm font-medium text-indigo-600">One-page product note</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">AI can draft frontline training in seconds. The hard part is trusting it.</h1>
          <p className="mt-3 text-slate-600">
            This concept adds a trust layer to AI course creation for store teams: every AI-written line is traced to the source document,
            anything that can&apos;t be traced is flagged, and nothing reaches staff until a manager has approved it.
          </p>
          <Link href="/" className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Try the prototype
          </Link>
        </div>

        <Section title="The problem">
          <p>
            Turning a procedure or product sheet into microlearning used to take hours, and AI course creators now do it in seconds. But in
            a store, a confident mistake is expensive: the wrong alarm step, a cash rule that doesn&apos;t exist, a medical claim the brand
            never makes, or a price that changes in translation.
          </p>
          <p>
            Store and L&amp;D managers don&apos;t have time to re-read every generated line against the original. So either they skip the
            check, or the time AI saved goes into reviewing it.
          </p>
        </Section>

        <Section title="What this prototype does">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b>Draft:</b> AI turns a source document into 5 lesson cards and 6 questions (2 recall, 2 apply, 2 judgement).
            </li>
            <li>
              <b>Trace:</b> every card and question must quote the source line it came from. Lines that can&apos;t be found, and numbers
              that aren&apos;t in the source, are flagged.
            </li>
            <li>
              <b>Review:</b> the manager only looks at flagged items: approve, edit or remove. Publishing is blocked until nothing is
              unresolved.
            </li>
            <li>
              <b>Translate safely:</b> French and Spanish versions are checked number by number against the English one (times, prices,
              quantities), then approved per language.
            </li>
            <li>
              <b>Learn:</b> store staff get mobile cards, an adaptive quiz that moves between recall, apply and judgement, and a
              &quot;Shift-ready&quot; result, or the exact cards to review.
            </li>
          </ol>
          <p className="text-sm text-slate-500">
            The two sample documents include deliberate failures so you can see the checks work: an invented safety rule in the opening
            procedure, and a price that changes from €129 to €192 in the Spanish translation.
          </p>
        </Section>

        <Section title="Why simple rules, not another AI judge">
          <p>
            The checks are deterministic: a quote must match a line in the source (at least 80% of its key words), and every number in a
            card or correct answer must exist in the source. A manager can understand exactly why something was flagged, and the check
            costs nothing to run.
          </p>
          <p>
            Known limits: a faithful paraphrase can be flagged (a false alarm the manager clears in one click), and a real quote can still
            sit next to a slightly wrong summary. Number checks cover the most costly version of that. A next step would be an entailment
            check on flagged items only.
          </p>
        </Section>

        <Section title="What I'd measure">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Time to publish</b> (draft + review), not just time to draft.
            </li>
            <li>
              <b>Share of items traced to source</b>, and how flagged items are resolved (approved, edited or removed) as a signal of
              generation quality.
            </li>
            <li>
              <b>Learner outcomes:</b> first-attempt &quot;Shift-ready&quot; rate, which cards get reviewed most, and questions most often
              missed (these point to unclear procedures, not just weak learners).
            </li>
            <li>
              <b>Translation flags per language</b>, before and after a prompt change.
            </li>
          </ul>
        </Section>

        <Section title="The bigger bet: from questions to courses">
          <p>
            Faster drafting answers &quot;how do we make this course?&quot;, but not &quot;which course do we need?&quot;. Store teams
            already say where training isn&apos;t landing: in the questions they ask a store assistant and the quiz questions they miss.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b>Rank</b> topics by questions per 100 associates, how often the assistant couldn&apos;t resolve them, and quiz misses.
            </li>
            <li>
              <b>Pick the right fix</b>, because most topics don&apos;t need a new course: ask HQ for a missing procedure, fix sources that
              disagree, repeat it in the daily quiz, or leave it to the assistant.
            </li>
            <li>
              <b>Draft a refresher</b> only where an approved source exists, with the same tracing and review as above.
            </li>
            <li>
              <b>Target and measure</b>: send it to the stores that asked, in two waves, and compare question rates between the waves.
            </li>
          </ol>
          <Link href="/questions" className="inline-block text-sm font-medium text-indigo-600 underline">
            Click through the questions-to-courses flow
          </Link>
        </Section>

        <Section title="If I took this further">
          <ul className="list-disc space-y-1 pl-5">
            <li>Pilot with a few stores on real procedures, and compare review time with and without tracing.</li>
            <li>Assign courses by role and trigger (new hire, new product launch, procedure update).</li>
            <li>When a procedure changes, flag only the cards and questions quoting the changed lines, instead of regenerating everything.</li>
            <li>Connect results to store execution, e.g. a missed alarm question prompts a manager check-in on the next opening shift.</li>
          </ul>
        </Section>

        <Section title="How it's built">
          <p>
            Next.js, TypeScript and Tailwind, with Groq for generation and translation (gpt-oss-120b, falling back to Llama 3.3 70B). A
            demo mode serves pre-generated output for the samples, so the full flow works without an API key. Built by{" "}
            <a className="text-indigo-600 underline" href="https://www.shubhamdahat.in/" target="_blank" rel="noreferrer">
              Shubham Dahat
            </a>{" "}
            on top of his Learnext AI tutor.
          </p>
        </Section>
      </main>
    </div>
  );
}
