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
    return `You are a ${language} language teacher. Generate EXACTLY ${count} vocabulary questions for skill band ${band} of 5.

CRITICAL REQUIREMENTS:
- Difficulty: ${difficulty}
- Single words or very short phrases only
- Mix directions: half English→${language}, half ${language}→English
- Each question has 5 multiple choice options
- All options must be real ${language} words

RESPONSE FORMAT - Return ONLY this JSON structure with NO other text:
[
  {
    "question": "Hello",
    "answer": "Bonjour",
    "options": ["Bonjour", "Au revoir", "Merci", "Bonsoir", "Salut"],
    "direction": "en-to-target",
    "type": "multiple-choice",
    "questionLanguage": "en"
  }
]

DO NOT include markdown, explanations, or any text outside the JSON array.`;
  }

  if (level === 'Moderate') {
    return `You are a ${language} language teacher. Generate EXACTLY ${count} conversational questions for skill band ${band} of 5.

CRITICAL REQUIREMENTS:
- Difficulty: ${difficulty}
- Phrases and short sentences
- 60% multiple choice (3 options), 40% type-answer (no options)
- Mix directions

RESPONSE FORMAT - Return ONLY this JSON structure with NO other text:
[
  {
    "question": "How are you?",
    "answer": "Comment allez-vous?",
    "options": ["Comment allez-vous?", "Où est la gare?", "Je m'appelle"],
    "direction": "en-to-target",
    "type": "multiple-choice",
    "questionLanguage": "en"
  },
  {
    "question": "Merci beaucoup",
    "answer": "Thank you very much",
    "direction": "target-to-en",
    "type": "type-answer",
    "questionLanguage": "target"
  }
]

DO NOT include markdown, explanations, or any text outside the JSON array.`;
  }

  return `You are a ${language} language teacher. Generate EXACTLY ${count} advanced questions for skill band ${band} of 5.

CRITICAL REQUIREMENTS:
- Difficulty: ${difficulty}
- Professional sentences or short paragraphs
- 50% multiple choice (3 options), 50% type-answer
- Mix directions

RESPONSE FORMAT - Return ONLY a JSON array with NO other text.
DO NOT include markdown, explanations, or any text outside the JSON array.`;
}

function parseQuestionsFromText(rawText: string, count: number): Question[] {
  console.log('Raw AI response (first 200 chars):', rawText.slice(0, 200));
  
  // Remove markdown code blocks
  let content = rawText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  
  // Remove any text before the first [
  const startIndex = content.indexOf('[');
  if (startIndex > 0) {
    content = content.slice(startIndex);
  }
  
  // Remove any text after the last ]
  const endIndex = content.lastIndexOf(']');
  if (endIndex !== -1) {
    content = content.slice(0, endIndex + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error('JSON Parse Error:', err);
    console.error('Attempted to parse:', content.slice(0, 500));
    throw new Error('AI returned invalid JSON. The model may need a moment to respond properly.');
  }

  if (!Array.isArray(parsed)) {
    console.error('Response is not an array:', parsed);
    throw new Error('AI response is not a valid array');
  }

  if (parsed.length === 0) {
    throw new Error('AI returned an empty array');
  }

  console.log(`AI returned ${parsed.length} items, processing...`);

  const items = (parsed as any[]).slice(0, count);
  const questions: Question[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Validate required fields
    if (!item.question || !item.answer) {
      console.warn(`Skipping item ${i}: missing question or answer`, item);
      continue;
    }

    const baseQuestion = String(item.question).trim();
    const baseAnswer = String(item.answer).trim();

    if (!baseQuestion || !baseAnswer) {
      console.warn(`Skipping item ${i}: empty question or answer`);
      continue;
    }

    const direction: Question['direction'] =
      item.direction === 'target-to-en' ? 'target-to-en' : 'en-to-target';

    const questionLanguage: Question['questionLanguage'] =
      item.questionLanguage === 'target' ? 'target' : 'en';

    // Determine type based on presence of options
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    const type: Question['type'] = hasOptions ? 'multiple-choice' : 'type-answer';

    let options: string[] | undefined;
    if (type === 'multiple-choice') {
      const rawOptions = Array.isArray(item.options) ? item.options : [];
      const baseOptions: string[] = rawOptions
        .map((o: any) => String(o).trim())
        .filter((o: string) => o.length > 0);
      
      // Ensure answer is in options
      if (!baseOptions.includes(baseAnswer)) {
        baseOptions.push(baseAnswer);
      }
      
      // Remove duplicates and shuffle
      const unique: string[] = Array.from(new Set(baseOptions));
      options = shuffle(unique).slice(0, 5);
      
      // If we don't have enough options, skip this question
      if (options.length < 2) {
        console.warn(`Skipping item ${i}: not enough valid options`);
        continue;
      }
    }

    questions.push({
      question: baseQuestion,
      answer: baseAnswer,
      options,
      direction,
      type,
      questionLanguage,
    });
  }

  console.log(`Successfully processed ${questions.length} valid questions`);

  if (questions.length === 0) {
    throw new Error('No valid questions could be extracted from AI response');
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

async function generateWithGroq(
  taskInstruction: string,
  count: number,
  retryCount: number = 0,
): Promise<Question[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment variables');
  }

  try {
    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a language teacher. Always respond with ONLY valid JSON arrays. Never include explanations, markdown formatting, or any text outside the JSON structure.',
        },
        {
          role: 'user',
          content: taskInstruction,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
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
      console.error('Groq HTTP error:', resp.status, text);
      
      // Retry on 429 (rate limit) or 503 (service unavailable)
      if ((resp.status === 429 || resp.status === 503) && retryCount < 2) {
        console.log(`Retrying after ${resp.status} error... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return generateWithGroq(taskInstruction, count, retryCount + 1);
      }
      
      throw new Error(`Groq API error: HTTP ${resp.status}`);
    }

    const json = await resp.json();
    const rawText: string | undefined = json?.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
      throw new Error('Groq returned empty response');
    }

    return parseQuestionsFromText(rawText, count);
    
  } catch (error) {
    console.error('Groq generation error:', error);
    
    // Retry on parsing errors (sometimes Groq just needs another attempt)
    if (retryCount < 2 && error instanceof Error && error.message.includes('JSON')) {
      console.log(`Retrying after JSON error... (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateWithGroq(taskInstruction, count, retryCount + 1);
    }
    
    throw error;
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
        : 6;

    if (!language || !level || isNaN(band) || isNaN(count)) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: language, level, band, or count' },
        { status: 400 },
      );
    }

    console.log(`\n=== Generating Questions ===`);
    console.log(`Language: ${language}, Level: ${level}, Band: ${band}, Count: ${count}`);

    const taskInstruction = buildTaskInstruction(language, level, band, count);
    const questions = await generateWithGroq(taskInstruction, count);

    console.log(`✅ Successfully generated ${questions.length} questions\n`);

    return NextResponse.json(questions, {
      status: 200,
      headers: {
        'x-llm-provider': 'Groq',
        'x-model': 'llama-3.3-70b-versatile',
        'x-questions-count': String(questions.length),
      },
    });

  } catch (err) {
    console.error('❌ Error in /api/questions route:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        hint: errorMessage.includes('GROQ_API_KEY') 
          ? 'Check if GROQ_API_KEY is set in your .env.local file'
          : 'Try clicking "Retry this band" button. The AI may need another attempt.'
      },
      { status: 500 },
    );
  }
}