import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type Level = "Basic" | "Moderate" | "Advanced";
type Language = "French" | "German" | "Spanish";

interface HistoryItem {
  role: "tutor" | "user";
  text: string;
}

interface TutorRequest {
  language: Language;
  level: Level;
  history: HistoryItem[];
  questionNumber: number;
  answer: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TutorRequest;
    const { language, level, history, questionNumber, answer } = body;

    const historyText =
      history.length === 0
        ? "(no previous messages)"
        : history
            .map((m) => `${m.role === "tutor" ? "Tutor" : "User"}: ${m.text}`)
            .join("\n");

    const prompt = `
You are a friendly ${language} tutor that teaches through short, interactive exercises.

The app has 3 levels:

1) Basic:
   - Focus on vocabulary, numbers and simple phrases.
   - For the first few questions (questionNumber 0-2):
     - Use multiple choice (mode = "mcq") with 3 or 4 options.
     - Keep words and numbers very simple.
   - After that, you can sometimes ask for short typed answers (mode = "text").

2) Moderate:
   - Mix greetings and day-to-day conversations.
   - Sometimes ask the user to pick the best reply (mode = "mcq").
   - Sometimes ask the user to type a short phrase or sentence (mode = "text").

3) Advanced:
   - Always use mode = "text".
   - Ask for short self-introductions, opinions or elevator-pitch style responses in ${language}.
   - You can give short English explanations if helpful.

Input context:
- Language: ${language}
- Level: ${level}
- Question number: ${questionNumber}
- Conversation so far:
${historyText}

The user just answered: "${answer || "(no answer yet)"}"

You must:
- Decide if the answer is correct, close or wrong (for scoring).
- Write a friendly explanation and feedback in replyText.
- Create the NEXT question as "nextQuestion", following the level rules above.
- Always increment totalDelta by 1 (we count each attempt).
- Set correctDelta to 1 for correct or very close answers, otherwise 0.

Output JSON shape (no extra properties):
{
  "replyText": "string - what the tutor says, including feedback and the next question in ${language}",
  "nextQuestion": {
    "text": "string - the next question or task, written in ${language} if possible",
    "mode": "mcq" or "text",
    "options": ["only if mode is mcq, list of answer options"]
  },
  "scoreUpdate": {
    "correctDelta": 0 or 1,
    "totalDelta": 1
  }
}

Rules:
- replyText must be short, clear and friendly.
- replyText must mention if the previous answer was right or wrong, and show a correct version if needed.
- For Basic level, keep sentences very short and simple.
- For Advanced level, focus on more complex sentences (for example an elevator pitch).
- Return ONLY valid JSON that matches the schema, nothing else.
`;

    // Use Gemini 2.5 Flash for low latency
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            replyText: { type: "string" },
            nextQuestion: {
              type: "object",
              properties: {
                text: { type: "string" },
                mode: { type: "string", enum: ["mcq", "text"] },
                options: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["text", "mode"],
              additionalProperties: false,
            },
            scoreUpdate: {
              type: "object",
              properties: {
                correctDelta: { type: "integer" },
                totalDelta: { type: "integer" },
              },
              required: ["correctDelta", "totalDelta"],
              additionalProperties: false,
            },
          },
          required: ["replyText", "nextQuestion", "scoreUpdate"],
          additionalProperties: false,
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Tutor API error", err);
    return NextResponse.json(
      { error: "Tutor API error", details: String(err) },
      { status: 500 }
    );
  }
}
