# Frontline Learn (concept)

Turn a store procedure or product sheet into a shift-ready micro-course, with a trust layer on top of the AI:

- **5 lesson cards + 6 questions**, each quoting the source line it came from
- **Grounding checks:** quotes must match the source, numbers must exist in the source
- **Manager review gate:** flagged items must be approved, edited or removed before publishing
- **FR / ES translation** with a number-by-number check against the English version
- **Learner preview:** mobile cards, adaptive quiz (Recall / Apply / Judgement), "Shift-ready" result or cards to review
- **Questions → courses** (`/questions`): rank what staff ask the store assistant and which quiz questions they miss, pick the right fix per topic, draft a traced refresher only where an approved source exists, target it in two waves and compare (simulated results)

Product note: [`/about`](app/about/page.tsx) in the app, or [`docs/ONE-PAGER.md`](docs/ONE-PAGER.md).

## Run locally

```bash
cd frontline-learn
npm install
npm run dev        # http://localhost:3000
```

Works out of the box in **demo mode** with the two sample documents (pre-generated output, including two deliberate errors for the checks to catch).

To generate from your own text, add a Groq key:

```bash
echo "GROQ_API_KEY=gsk_..." > .env.local
```

## Deploy on Vercel

1. Vercel → Add New → Project → import `datascout0/ai-tutor-mvp`.
2. **Root Directory:** `frontline-learn`. Framework: Next.js (auto-detected).
3. Git branch: `frontline-learn-concept` (or merge it into `main` first).
4. Optional: add `GROQ_API_KEY` under Environment Variables.
5. Deploy.

## Structure

```
app/page.tsx              3-step flow: source → review & publish → learner preview
app/questions/page.tsx    questions → courses loop (components/QuestionsLoop.tsx, data in lib/signals.ts)
app/about/page.tsx        one-page product note
app/api/generate          Groq generation (or demo output for the samples)
app/api/translate         Groq translation (or demo output), structure kept from the original
components/               SourceStep, ItemRow (review card), LearnerPreview (phone), Header
lib/grounding.ts          quote matching, number checks, translation number diff
lib/adaptive.ts           adaptive quiz: level up/down, scoring, cards to review
lib/samples.ts            two fictional sample documents + demo outputs
lib/prompts.ts, groq.ts   prompts and Groq client (gpt-oss-120b → llama-3.3-70b fallback)
```

All sample companies, products and procedures are fictional.
