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
      return 'basic A1-A2 difficulty, slightly harder than band 1';
    case 3:
      return 'intermediate B1 difficulty, clearly harder than band 2';
    case 4:
      return 'upper-intermediate B2 difficulty, clearly harder than band 3';
    case 5:
    default:
      return 'advanced C1 difficulty, clearly harder than band 4';
  }
}

function buildTaskInstruction(
  language: LanguageKey,
  level: Level,
  band: number,
  count: number,
): string {
  const difficulty = difficultyDescriptor(band);

  if (level === 'Basic') {
    return `You are a ${language} language teacher.
Generate EXACTLY ${count} vocabulary questions for skill band ${band} of 5.

Requirements:
- Difficulty: ${difficulty}
- Target user is an English speaker learning ${language}.
- Single words or very short phrases only (no long sentences).
- Mix directions:
  - At least half English -> ${language}
  - The rest ${language} -> English
- Each question must be multiple choice with 4-5 plausible options.
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
  }

  if (level === 'Moderate') {
    return `You are a ${language} language teacher.
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
  }

  return `You are a ${language} language teacher.
Generate EXACTLY ${count} advanced questions for skill band ${band} of 5.

Requirements:
- Difficulty: ${difficulty}
- Professional or elevator-pitch style sentences or short paragraphs.
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

function parseQuestionsFromText(rawText: string, count: number, source: string): Question[] {
  let content = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    content = match[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error(`Failed to parse JSON from ${source}`, err, content.slice(0, 400));
    throw new Error(`${source} returned invalid JSON`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${source} returned empty or invalid array`);
  }

  const items = (parsed as any[]).slice(0, count);

  const questions: Question[] = items
    .map((item) => {
      const baseQuestion = String(item.question ?? '');
      const baseAnswer = String(item.answer ?? '');

      if (!baseQuestion.trim() || !baseAnswer.trim()) {
        return null;
      }

      const direction: Question['direction'] =
        item.direction === 'target-to-en' ? 'target-to-en' : 'en-to-target';

      const questionLanguage: Question['questionLanguage'] =
        item.questionLanguage === 'target' ? 'target' : 'en';

      const type: Question['type'] =
        item.type === 'type-answer' ? 'type-answer' : 'multiple-choice';

      let options: string[] | undefined;
      if (type === 'multiple-choice') {
        const rawOptions = Array.isArray(item.options) ? item.options : [];
        const baseOptions = rawOptions.map((o: any) => String(o));
        if (!baseOptions.includes(baseAnswer)) {
          baseOptions.push(baseAnswer);
        }
        const unique = Array.from(new Set(baseOptions));
        options = shuffle(unique).slice(0, 5);
      }

      const q: Question = {
        question: baseQuestion,
        answer: baseAnswer,
        options,
        direction,
        type,
        questionLanguage,
      };

      return q;
    })
    .filter((q): q is Question => q !== null);

  if (!questions.length) {
    throw new Error(`${source} did not produce any usable questions`);
  }

  return questions;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function generateWithGemini(
  taskInstruction: string,
  count: number,
): Promise<Question[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: taskInstruction }],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Gemini HTTP error', resp.status, text);
    throw new Error(`Gemini HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const rawText: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    json?.candidates?.[0]?.output_text?.trim();

  if (!rawText) {
    throw new Error('Gemini returned empty text');
  }

  return parseQuestionsFromText(rawText, count, 'Gemini');
}

async function generateWithGroq(
  taskInstruction: string,
  count: number,
): Promise<Question[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const body = {
    model: 'llama-3.1-70b-versatile',
    messages: [
      {
        role: 'user',
        content: taskInstruction,
      },
    ],
    temperature: 0.2,
  };

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Groq HTTP error', resp.status, text);
    throw new Error(`Groq HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const rawText: string | undefined = json?.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new Error('Groq returned empty text');
  }

  return parseQuestionsFromText(rawText, count, 'Groq');
}

async function generateWithOpenAI(
  taskInstruction: string,
  count: number,
): Promise<Question[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const body = {
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: taskInstruction,
      },
    ],
    temperature: 0.2,
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('OpenAI HTTP error', resp.status, text);
    throw new Error(`OpenAI HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const rawText: string | undefined = json?.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new Error('OpenAI returned empty text');
  }

  return parseQuestionsFromText(rawText, count, 'OpenAI');
}

async function generateWithPerplexity(
  taskInstruction: string,
  count: number,
): Promise<Question[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  const body = {
    model: 'llama-3.1-sonar-small-128k-chat',
    messages: [
      {
        role: 'user',
        content: taskInstruction,
      },
    ],
    temperature: 0.2,
  };

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Perplexity HTTP error', resp.status, text);
    throw new Error(`Perplexity HTTP ${resp.status}`);
  }

  const json = await resp.json();
  const rawText: string | undefined = json?.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new Error('Perplexity returned empty text');
  }

  return parseQuestionsFromText(rawText, count, 'Perplexity');
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
        : 6;

    if (!language || !level || !band || !count) {
      return NextResponse.json(
        { error: 'Missing language, level, band, or count' },
        { status: 400 },
      );
    }

    const taskInstruction = buildTaskInstruction(language, level, band, count);

    const providers: {
      name: string;
      fn: (inst: string, c: number) => Promise<Question[]>;
    }[] = [];

    if (process.env.GEMINI_API_KEY) {
      providers.push({ name: 'Gemini', fn: generateWithGemini });
    }
    if (process.env.OPENAI_API_KEY) {
      providers.push({ name: 'OpenAI', fn: generateWithOpenAI });
    }
    if (process.env.GROQ_API_KEY) {
      providers.push({ name: 'Groq', fn: generateWithGroq });
    }
    if (process.env.PERPLEXITY_API_KEY) {
      providers.push({ name: 'Perplexity', fn: generateWithPerplexity });
    }

    if (!providers.length) {
      return NextResponse.json(
        { error: 'No LLM API keys configured on server' },
        { status: 500 },
      );
    }

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const questions = await provider.fn(taskInstruction, count);
        if (questions && questions.length) {
          return NextResponse.json(questions, {
            status: 200,
            headers: {
              'x-llm-provider': provider.name,
            },
          });
        }
      } catch (err: any) {
        console.error(`Provider ${provider.name} failed`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }

    return NextResponse.json(
      {
        error:
          lastError?.message ||
          'All LLM providers failed. Check server logs for details.',
      },
      { status: 500 },
    );
  } catch (err) {
    console.error('Error in /api/questions route', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
