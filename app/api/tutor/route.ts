import { NextResponse } from 'next/server';

type Level = 'Basic' | 'Moderate' | 'Advanced';
type LanguageKey = 'French' | 'German' | 'Spanish' | 'Italian';

interface Question {
  question: string;
  answer: string;
  options?: string[];
  direction: 'en-to-target' | 'target-to-en';
  type: 'multiple-choice' | 'type-answer';
  questionLanguage: 'en' | 'target';
}

function difficultyDescriptor(band: number): string {
  switch (band) {
    case 1:
      return 'very basic A1 starter difficulty';
    case 2:
      return 'basic A1–A2 difficulty, slightly harder than band 1';
    case 3:
      return 'intermediate B1 difficulty, clearly harder than band 2';
    case 4:
      return 'upper–intermediate B2 difficulty, clearly harder than band 3';
    case 5:
    default:
      return 'advanced C1 difficulty, clearly harder than band 4';
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const language = body.language as LanguageKey | undefined;
    const level = body.level as Level | undefined;
    const bandRaw = body.band;
    const countRaw = body.count;

    const band =
      typeof bandRaw === 'number'
        ? bandRaw
        : typeof bandRaw === 'string'
        ? Number(bandRaw)
        : NaN;

    const count =
      typeof countRaw === 'number'
        ? countRaw
        : typeof countRaw === 'string'
        ? Number(countRaw)
        : 8;

    if (!language || !level || !band || !count) {
      return NextResponse.json(
        { error: 'Missing language, level, band, or count' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment');
      return NextResponse.json(
        { error: 'Server is not configured with GEMINI_API_KEY' },
        { status: 500 },
      );
    }

    const difficulty = difficultyDescriptor(band);

    let taskInstruction = '';

    if (level === 'Basic') {
      taskInstruction = `
You are a ${language} language teacher.
Generate EXACTLY ${count} vocabulary questions for skill band ${band} of 5.

Requirements:
- Difficulty: ${difficulty}
- Target user is an English speaker learning ${language}.
- Single words or very short phrases only (no long sentences).
- Mix directions:
  - At least half English -> ${language}
  - The rest ${language} -> English
- Each question must be multiple choice with 4–5 plausible options.
- Options must be real plausible words, not nonsense.
- Make sure questions for this band are DIFFERENT from earlier bands conceptually.

Return ONLY a pure JSON array, no markdown, no explanations.
Each item must strictly have:
{
  "question": "string",
  "answer": "string",
  "options": ["opt1","opt2","opt3","opt4","opt5"],
  "direction": "en-to-target" | "target-to-en",
  "type": "multiple-choice",
  "questionLanguage": "en" | "target"
}`;
    } else if (level === 'Moderate') {
      taskInstruction = `
You are a ${language} language teacher.
Generate EXACTLY ${count} conversational questions for skill band ${band} of 5.

Requirements:
- Difficulty: ${difficulty}
- Phrases and short sentences used in everyday conversations.
- Mix of:
  - Multiple choice questions (3 plausible options)
  - Type-answer questions (no options)
- Mix directions:
  - Some English -> ${language}
  - Some ${language} -> English
- Make this band clearly more challenging than earlier bands.

Return ONLY a pure JSON array, no markdown, no explanations.
Each item must strictly have:
{
  "question": "string",
  "answer": "string",
  "options": ["opt1","opt2","opt3"] or null for type-answer,
  "direction": "en-to-target" | "target-to-en",
  "type": "multiple-choice" | "type-answer",
  "questionLanguage": "en" | "target"
}`;
    } else {
      taskInstruction = `
You are a ${language} language teacher.
Generate EXACTLY ${count} advanced questions for skill band ${band} of 5.

Requirements:
- Difficulty: ${difficulty}
- Professional / elevator-pitch style sentences or short paragraphs.
- Mix of:
  - Multiple choice questions (3 plausible options)
  - Type-answer questions
- Mix directions:
  - Some English -> ${language}
  - Some ${language} -> English
- Make sure this band is clearly more advanced than earlier bands.

Return ONLY a pure JSON array, no markdown, no explanations.
Each item must strictly have:
{
  "question": "string",
  "answer": "string",
  "options": ["opt1","opt2","opt3"] or null for type-answer,
  "direction": "en-to-target" | "target-to-en",
  "type": "multiple-choice" | "type-answer",
  "questionLanguage": "en" | "target"
}`;
    }

    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: taskInstruction }],
        },
      ],
      generationConfig: {
        // This strongly nudges Gemini to output parseable JSON only
        response_mime_type: 'application/json',
      },
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiBody),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Gemini API HTTP error', resp.status, text);
      return NextResponse.json(
        { error: `Gemini API error: HTTP ${resp.status}` },
        { status: 500 },
      );
    }

    const json = await resp.json();

    // With response_mime_type=application/json, Gemini usually returns JSON in parts[0].text
    const rawText: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      json?.candidates?.[0]?.output_text?.trim();

    if (!rawText) {
      console.error('No text in Gemini response', JSON.stringify(json).slice(0, 400));
      return NextResponse.json(
        { error: 'Invalid Gemini response: empty text' },
        { status: 500 },
      );
    }

    let content = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      content = match[0];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse AI JSON', err, content.slice(0, 400));
      return NextResponse.json(
        { error: 'Failed to parse AI JSON from Gemini' },
        { status: 500 },
      );
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: 'AI returned empty or invalid array' },
        { status: 500 },
      );
    }

    const questions: Question[] = (parsed as any[])
      .slice(0, count)
      .map((item) => {
        const q: Question = {
          question: String(item.question ?? ''),
          answer: String(item.answer ?? ''),
          options: Array.isArray(item.options)
            ? item.options.map((o: any) => String(o))
            : undefined,
          direction: item.direction === 'target-to-en' ? 'target-to-en' : 'en-to-target',
          type: item.type === 'type-answer' ? 'type-answer' : 'multiple-choice',
          questionLanguage: item.questionLanguage === 'target' ? 'target' : 'en',
        };
        return q;
      })
      .filter((q) => q.question.trim() && q.answer.trim());

    if (!questions.length) {
      return NextResponse.json(
        { error: 'No usable questions from AI' },
        { status: 500 },
      );
    }

    return NextResponse.json(questions, { status: 200 });
  } catch (err) {
    console.error('Error in /api/questions route', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
