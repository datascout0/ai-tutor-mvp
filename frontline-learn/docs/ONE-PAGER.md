# Frontline Learn: a trust layer for AI-generated store training

**Shubham Dahat · concept prototype · November 2026**

## The problem

AI course creators can now turn a procedure, product sheet or planogram into microlearning in seconds. For store teams, the risk moves from *"it takes too long to make training"* to *"can we trust what the AI wrote?"*

A confident mistake is costly on the shop floor: an alarm step that's wrong, a staffing rule that doesn't exist, a medical claim the brand never makes, or a price that changes in translation. L&D and store managers don't have time to re-read every generated line against the source. So either they skip the check, or the time AI saved goes into reviewing it.

## The idea

Keep the speed of AI drafting, but make every item **traceable** and only ask the manager to look at what can't be traced.

1. **Draft:** AI turns one source document into 5 lesson cards and 6 questions (2 recall, 2 apply, 2 judgement).
2. **Trace:** every card and question must quote the source line it came from. Two deterministic checks run in the browser:
   - the quote must match a line in the source (at least 80% of its key words);
   - every number in a card, or in a question's correct answer, must exist in the source.
3. **Review:** the manager sees only flagged items (approve, edit or remove). Publishing is blocked while anything is unresolved.
4. **Translate safely:** French and Spanish versions are checked number by number against the English one (times, prices, quantities), then approved per language. Only approved languages reach learners.
5. **Learn:** mobile cards, each showing "From the procedure" on tap; an adaptive quick check that starts at *Apply*, moves up after a right answer and down after a wrong one; a "Shift-ready" result at 80%+, or the exact cards to review based on the questions missed.

The samples include deliberate failures so the checks can be seen working: an invented "two team members must be present" rule in the opening procedure, and €129 becoming €192 in the Spanish launch sheet.

## Why simple rules rather than another AI judge

- A manager can see exactly *why* something was flagged ("uses a number not in your procedure: 2").
- It costs nothing to run and gives the same answer every time.
- Known limits: a faithful paraphrase can be flagged (a one-click false alarm), and a real quote can sit next to a slightly wrong summary. The number check covers the most expensive version of that. Next step: an entailment check on flagged items only.

## What I'd measure

| Metric | Why it matters |
|---|---|
| Time to publish (draft + review) | The real cost of a course, not just generation time |
| % of items traced to source; how flags are resolved (approved / edited / removed) | Generation quality, and whether flags are useful or noise |
| First-attempt "Shift-ready" rate; most-reviewed cards; most-missed questions | Learner outcomes, and procedures that are unclear rather than learners who are weak |
| Translation flags per language, before/after a prompt change | Whether multilingual rollout is safe to automate further |

## If I took it further

- Pilot with a few stores on real procedures; compare review time with and without tracing.
- Assign by role and trigger (new hire, product launch, procedure update).
- When a procedure changes, re-check only the cards and questions quoting the changed lines instead of regenerating the course.
- Close the loop with store execution: a missed alarm question prompts a manager check-in on the next opening shift.

## How it's built

Next.js 16, TypeScript, Tailwind. Groq for generation and translation (`openai/gpt-oss-120b`, falling back to `llama-3.3-70b-versatile`), JSON output. Grounding and translation checks run client-side in plain TypeScript. A demo mode serves pre-generated output for the two samples, so the full flow works without an API key. Built on the same stack as my Learnext AI tutor.
