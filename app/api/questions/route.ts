import { NextResponse } from 'next/server';

type Level = 'Basic' | 'Moderate' | 'Advanced';
type LanguageKey = 'French' | 'German' | 'Spanish' | 'Italian';

interface Question {
  question: string;
  answer: string;
  options?: string[];
  direction: 'en-to-target' | 'target-to-en' | 'target-to-target';
  type: 'multiple-choice' | 'type-answer' | 'fill-in-the-blanks';
  questionLanguage: 'en' | 'target';
  explanation?: string;
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
Create a clean JSON dataset of EXACTLY ${count} beginner VOCABULARY questions for SKILL BAND ${band} of 5.

Learner profile:
- Native language: English
- Target language: ${language}
- CEFR difficulty: ${difficulty}

Pedagogy:
- Basic level = single words or very short 1–2 word phrases only.
- No full sentences or paragraphs.
- Each higher band must clearly feel harder using different topic clusters:
  Band 1: greetings, yes/no, please/thank you, numbers 1–20, basic colours.
  Band 2: food & drinks, cafe/restaurant vocabulary (nouns + 2–3 common verbs).
  Band 3: family, people, simple jobs, common everyday objects.
  Band 4: places in town, transport, simple directions.
  Band 5: time expressions, days of week, daily routine verbs.

Question design:
- ALL questions are multiple-choice.
- 4–5 options per question.
- Answer Options should be confusing enough.
- At least half of the questions must be English → ${language}.
- The rest must be ${language} → English.
- All options must be real, plausible words in the correct language.
- Do NOT repeat the exact same word across different bands.

Required JSON format:
Return ONLY a JSON array, with no markdown and no explanations outside the JSON. Use exactly these keys for every item:

[
  {
    "question": "Hello",
    "answer": "Bonjour",
    "options": ["Bonjour", "Au revoir", "Merci", "Bonsoir"],
    "direction": "en-to-target",
    "type": "multiple-choice",
    "questionLanguage": "en",
    "explanation": "This is the standard way to say 'Hello' in French."
  }
]

Rules:
- "questionLanguage" = "en" when the question text is in English, "target" when it is in ${language}.
- "direction" must be "en-to-target" or "target-to-en" and must match the actual translation direction.
- The correct answer MUST appear inside "options" exactly once.
- "explanation" must be 1–2 short sentences in English describing WHY the answer is correct.
- Do NOT include any fields other than the ones shown.`;
  }

  if (level === 'Moderate') {
    return `You are a ${language} language teacher.
Create a clean JSON dataset of EXACTLY ${count} everyday CONVERSATIONAL questions for SKILL BAND ${band} of 5.

Learner profile:
- Native language: English
- Target language: ${language}
- CEFR difficulty: ${difficulty}

Pedagogy:
- Moderate level = short everyday sentences (5–12 words) and common phrases.
- No long paragraphs.
- Each higher band must clearly feel more complex:
  Band 1: greetings, introductions, simple "How are you?"-type exchanges.
  Band 2: food orders, directions, shopping, basic travel situations.
  Band 3: daily routines, hobbies, preferences, invitations.
  Band 4: describing problems, giving reasons, simple opinions using "because", "but".
  Band 5: expressing plans, comparing options, simple past/future actions.

Question types:
- Use a MIX of:
  - "multiple-choice" questions,
  - "type-answer" questions,
  - "fill-in-the-blanks" questions.
- "fill-in-the-blanks" questions must:
  - have the question text entirely in ${language},
  - have all options entirely in ${language},
  - represent the correct answer as one string, e.g. "eau / allée",
  - use 4 options in total,
  - use "direction": "target-to-target",
  - use "questionLanguage": "target".
  - have 1-2 blanks

Question design:
- Mix directions: English → ${language}, ${language} → English, and target-only for fill-in.
- Answer Options should be confusing enough.
- About 50% multiple-choice, 20% type-answer, 30% fill-in-the-blanks across the set.

Required JSON format:
Return ONLY a JSON array with no extra text. Use exactly these keys:

[
  {
    "question": "Where is the train station?",
    "answer": "Où est la gare ?",
    "options": [
      "Où est la gare ?",
      "Je prends le bus.",
      "Je voudrais un café."
    ],
    "direction": "en-to-target",
    "type": "multiple-choice",
    "questionLanguage": "en",
    "explanation": "This is the direct translation of 'Where is the train station?' in French."
  },
  {
    "question": "Je travaille à la maison.",
    "answer": "I work from home.",
    "options": [],
    "direction": "target-to-en",
    "type": "type-answer",
    "questionLanguage": "target",
    "explanation": "The sentence literally means 'I work at the house', which is used to mean 'I work from home.'"
  },
  {
    "question": "Quand il fait très chaud, je bois beaucoup d'_____ et je cherche toujours l'_____ la plus ombragée.",
    "answer": "eau / allée",
    "options": ["eau / allée", "air / heure", "lait / maison", "jus / journée"],
    "direction": "target-to-target",
    "type": "fill-in-the-blanks",
    "questionLanguage": "target",
    "explanation": "In hot weather you drink water and look for the shadiest path, so 'eau / allée' is the natural combination."
  }
]

Rules:
- For "multiple-choice": "options" must be an array of 3–5 full candidate answers in the answer language and MUST include the correct answer exactly once.
- For "type-answer": set "options" to [] (an empty array).
- For "fill-in-the-blanks":
  - "question" and all "options" must be in ${language} only.
  - "direction" must be "target-to-target".
  - "questionLanguage" must be "target".
  - "options" must contain exactly 4 entries and include the correct answer exactly once.
- "explanation" must be 1–2 short sentences in English explaining why the answer is correct.
- Do NOT include any keys other than: question, answer, options, direction, type, questionLanguage, explanation.`;
  }

  // Advanced level
  return `You are a professional ${language} language teacher.
Create a clean JSON dataset of EXACTLY ${count} ADVANCED questions for SKILL BAND ${band} of 5.

Learner profile:
- Native language: English
- Target language: ${language}
- Adult learner using the language in a business or professional context.
- CEFR difficulty: ${difficulty}

Pedagogy:
- Advanced level = longer, natural sentences or short 1–2 sentence paragraphs.
- Focus on professional and elevator-pitch style topics:
  Band 1: simple job & company descriptions ("I work as...", "My company does...").
  Band 2: daily responsibilities, tools, and simple project descriptions.
  Band 3: explaining goals, challenges, and outcomes of a project.
  Band 4: describing trade-offs, stakeholder communication, giving structured opinions.
  Band 5: vision, strategy, future impact, more abstract concepts.

Question types:
- Use a MIX of:
  - "multiple-choice" questions,
  - "type-answer" questions,
  - "fill-in-the-blanks" questions using more advanced vocabulary and grammar.

Question design:
- Approximately 30% type-answer (to force free production), 40% multiple-choice and 30% fill-in combined.
- Mix directions: English → ${language}, ${language} → English, and target-only for fill-in-the-blanks.
- Answer Options should be confusing enough.
- "fill-in-the-blanks" questions:
  - are written entirely in ${language},
  - may contain 2–3 blanks,
  - have 4 options, each option being a full candidate completion in ${language},
  - use "direction": "target-to-target",
  - use "questionLanguage": "target".

Required JSON format:
Return ONLY a JSON array with no extra text. Use exactly these keys:

[
  {
    "question": "I work as a product manager in a tech company that builds mobile applications.",
    "answer": "Je travaille comme chef de produit dans une entreprise technologique qui développe des applications mobiles.",
    "options": [
      "Je travaille comme chef de produit dans une entreprise technologique qui développe des applications mobiles.",
      "Je suis étudiant en informatique.",
      "Je travaille dans un restaurant."
    ],
    "direction": "en-to-target",
    "type": "multiple-choice",
    "questionLanguage": "en",
    "explanation": "This option correctly expresses working as a product manager in a tech company that builds mobile apps."
  },
  {
    "question": "Nous avons décidé de lancer le produit plus tard afin d'améliorer la qualité et de réduire les risques pour les clients.",
    "answer": "We decided to launch the product later in order to improve quality and reduce risk for customers.",
    "options": [],
    "direction": "target-to-en",
    "type": "type-answer",
    "questionLanguage": "target",
    "explanation": "The sentence explains delaying the launch to improve quality and reduce risk for customers."
  },
  {
    "question": "Si nous voulons réussir sur ce marché, nous devons définir une _____ claire et impliquer tous les _____ dès le début.",
    "answer": "stratégie / acteurs",
    "options": [
      "stratégie / acteurs",
      "campagne / clients",
      "promotion / utilisateurs",
      "réduction / partenaires"
    ],
    "direction": "target-to-target",
    "type": "fill-in-the-blanks",
    "questionLanguage": "target",
    "explanation": "In a business context you define a strategy and involve all stakeholders ('acteurs') from the beginning."
  }
]

Rules:
- For "multiple-choice": "options" must include the correct answer exactly once and at least 3 total options.
- For "type-answer": set "options" to [] (empty array).
- For "fill-in-the-blanks":
  - "question" and all "options" must be in ${language} only.
  - "direction" must be "target-to-target".
  - "questionLanguage" must be "target".
  - "options" must contain exactly 4 entries and include the correct answer exactly once.
- "explanation" must be 1–2 short sentences in English explaining why the answer is correct.
- Do NOT write any explanations, headings or comments outside the JSON array.`;
}

function parseQuestionsFromText(rawText: string, count: number): Question[] {
  console.log('Raw AI response (first 200 chars):', rawText.slice(0, 200));

  // Strip markdown code fences if present
  let content = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Keep only the JSON array part
  const firstBracket = content.indexOf('[');
  if (firstBracket > 0) {
    content = content.slice(firstBracket);
  }
  const lastBracket = content.lastIndexOf(']');
  if (lastBracket !== -1 && lastBracket < content.length - 1) {
    content = content.slice(0, lastBracket + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error('JSON parse failed:', err);
    throw new Error('AI returned invalid JSON. Please retry this skill band.');
  }

  if (!Array.isArray(parsed)) {
    console.error('AI response is not an array:', parsed);
    throw new Error('AI response is not a valid array of questions.');
  }

  const questions: Question[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as any;

    const qText =
      typeof raw.question === 'string' && raw.question.trim().length > 0
        ? raw.question.trim()
        : '';
    const aText =
      typeof raw.answer === 'string' && raw.answer.trim().length > 0
        ? raw.answer.trim()
        : '';

    if (!qText || !aText) {
      console.warn('Skipping item: missing question or answer', raw);
      continue;
    }

    const direction: Question['direction'] =
      raw.direction === 'target-to-en'
        ? 'target-to-en'
        : raw.direction === 'target-to-target'
        ? 'target-to-target'
        : 'en-to-target';

    const questionLanguage: Question['questionLanguage'] =
      raw.questionLanguage === 'target' ? 'target' : 'en';

    const hasOptions = Array.isArray(raw.options) && raw.options.length > 0;
    const inferredType: Question['type'] = hasOptions ? 'multiple-choice' : 'type-answer';

    let type: Question['type'];
    if (raw.type === 'fill-in-the-blanks') {
      type = 'fill-in-the-blanks';
    } else if (raw.type === 'type-answer' || !hasOptions) {
      type = 'type-answer';
    } else {
      type = 'multiple-choice';
    }

    let options: string[] | undefined;
    if (type === 'multiple-choice' || type === 'fill-in-the-blanks') {
      const rawOptions = Array.isArray(raw.options) ? raw.options : [];
      const baseOptions: string[] = rawOptions
        .map((o: any) => String(o).trim())
        .filter((o: string) => o.length > 0);

      if (!baseOptions.includes(aText)) {
        baseOptions.push(aText);
      }

      const unique: string[] = Array.from(new Set(baseOptions));
      const maxOptions = type === 'fill-in-the-blanks' ? 4 : 5;
      options = shuffle(unique).slice(0, Math.min(unique.length, maxOptions));

      if (!options || options.length < 2) {
        console.warn('Skipping item: not enough valid options', raw);
        continue;
      }
    }

    const explanationText =
      typeof raw.explanation === 'string' && raw.explanation.trim().length > 0
        ? raw.explanation.trim()
        : '';

    const explanation =
      explanationText ||
      (type === 'fill-in-the-blanks'
        ? 'The correct option best completes the sentence naturally in the target language.'
        : 'The correct answer best matches the intended meaning and natural usage in this context.');

    questions.push({
      question: qText,
      answer: aText,
      options,
      direction,
      type,
      questionLanguage,
      explanation,
    });

    if (questions.length >= count) {
      break;
    }
  }

  console.log(`Successfully processed ${questions.length} questions out of requested ${count}.`);

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
          content: 'You are a language teacher. Always respond with ONLY valid JSON arrays of question objects that follow the requested schema, including an "explanation" field in English for each question. Do not include markdown formatting or any extra text outside the JSON array.',
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