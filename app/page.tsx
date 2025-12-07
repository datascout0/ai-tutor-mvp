"use client";

import { useEffect, useState } from "react";

type Language = "French" | "German" | "Spanish";
type Level = "Basic" | "Moderate" | "Advanced";
type Mode = "mcq" | "text";

interface Message {
  role: "tutor" | "user";
  text: string;
}

interface Question {
  text: string;
  mode: Mode;
  options?: string[];
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("French");
  const [level, setLevel] = useState<Level>("Basic");
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [scoreTotal, setScoreTotal] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const accuracy =
    scoreTotal === 0 ? 0 : Math.round((scoreCorrect / scoreTotal) * 100);

  function levelSubtitle(level: Level) {
    if (level === "Basic") {
      return "Basic - vocab, numbers and simple phrases.";
    }
    if (level === "Moderate") {
      return "Moderate - greetings and daily conversations.";
    }
    return "Advanced - elevator-pitch style answers in the target language.";
  }

  async function callTutor(nextAnswer: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          level,
          history: chat,
          questionNumber,
          answer: nextAnswer,
        }),
      });

      if (!res.ok) {
        throw new Error("API error");
      }

      const data: {
        replyText: string;
        nextQuestion: Question;
        scoreUpdate: { correctDelta: number; totalDelta: number };
      } = await res.json();

      const newChat: Message[] = [
        ...chat,
        { role: "user", text: nextAnswer || "(no answer yet)" },
        { role: "tutor", text: data.replyText },
      ];
      setChat(newChat);

      setScoreCorrect((prev) => prev + data.scoreUpdate.correctDelta);
      setScoreTotal((prev) => prev + data.scoreUpdate.totalDelta);

      setQuestionNumber((prev) => prev + 1);
      setCurrentQuestion(data.nextQuestion);
      setAnswer("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong talking to the tutor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAskTutor() {
    await callTutor(answer);
  }

  function handleOptionClick(option: string) {
    setAnswer(option);
  }

  function speakText(text: string) {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) {
      alert("Speech not supported in this browser.");
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }

  function getSpeechLang(lang: Language): string {
    if (lang === "French") return "fr-FR";
    if (lang === "German") return "de-DE";
    return "es-ES";
  }

  function startSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLang(language);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswer(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      alert("Speech recognition error. Try again.");
    };

    recognition.start();
  }

  function handleResetSession() {
    setScoreCorrect(0);
    setScoreTotal(0);
    setQuestionNumber(0);
    setCurrentQuestion(null);
    setAnswer("");
    setChat([]);
  }

  useEffect(() => {
    // reset session when language or level changes
    handleResetSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-md p-4 sm:p-6 flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">AI Language Tutor</h1>
            <button
              className="text-xs border px-2 py-1 rounded-md hover:bg-slate-50"
              onClick={handleResetSession}
              type="button"
            >
              Reset session
            </button>
          </div>
          <p className="text-sm text-slate-600">{levelSubtitle(level)}</p>
          <div className="flex flex-wrap gap-2 mt-1 items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option>French</option>
              <option>German</option>
              <option>Spanish</option>
            </select>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option>Basic</option>
              <option>Moderate</option>
              <option>Advanced</option>
            </select>
            <div className="text-sm text-slate-700 flex items-center gap-2">
              <span>
                Score: {scoreCorrect} / {scoreTotal}
              </span>
              <span>Accuracy: {accuracy}%</span>
            </div>
          </div>
        </header>

        <section className="flex-1 flex flex-col gap-2 min-h-[250px]">
          <div className="border rounded-md p-2 h-64 overflow-y-auto bg-slate-50 text-sm">
            {chat.length === 0 && (
              <p className="text-slate-500">
                Click &quot;Ask tutor&quot; to get your first question.
              </p>
            )}
            {chat.map((msg, idx) => (
              <div
                key={idx}
                className={`flex mb-2 ${
                  msg.role === "tutor" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-md ${
                    msg.role === "tutor"
                      ? "bg-white border text-slate-800"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <div className="text-[11px] opacity-70 mb-1">
                    {msg.role === "tutor" ? "Tutor" : "You"}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  {msg.role === "tutor" && (
                    <button
                      type="button"
                      className="mt-1 text-[11px] underline text-blue-700"
                      onClick={() => speakText(msg.text)}
                    >
                      Listen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm">
            <div className="font-semibold mb-1">Current question</div>
            {currentQuestion ? (
              <div className="mb-2">
                <div className="mb-1">{currentQuestion.text}</div>
                {currentQuestion.mode === "mcq" &&
                  currentQuestion.options &&
                  currentQuestion.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentQuestion.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`px-2 py-1 border rounded-md text-xs ${
                            answer === opt
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-800"
                          }`}
                          onClick={() => handleOptionClick(opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="mb-2 text-slate-500">
                No question yet - click &quot;Ask tutor&quot; to start.
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <textarea
            className="border rounded-md p-2 text-sm min-h-[60px]"
            placeholder="Type your answer here or use Speak answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 justify-between">
            <button
              type="button"
              onClick={startSpeechRecognition}
              className="border rounded-md text-sm px-3 py-1 hover:bg-slate-50"
            >
              🎙️ Speak answer
            </button>
            <button
              type="button"
              onClick={handleAskTutor}
              disabled={loading}
              className="bg-blue-600 text-white rounded-md text-sm px-4 py-1 disabled:opacity-60"
            >
              {loading ? "Talking to tutor..." : "Ask tutor"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
