'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ArrowRight, ArrowLeft, Check, X, User, Square, Download } from 'lucide-react';
type Screen = 'welcome' | 'language' | 'level' | 'band' | 'quiz' | 'report';
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

interface AnswerRecord {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation?: string;
}

const QUESTIONS_PER_BAND = 6;

const languages: Record<LanguageKey, { code: string; label: string; bg: string }> = {
  French: { code: 'fr-FR', label: 'FR', bg: 'bg-blue-600' },
  German: { code: 'de-DE', label: 'DE', bg: 'bg-yellow-600' },
  Spanish: { code: 'es-ES', label: 'ES', bg: 'bg-red-600' },
  Italian: { code: 'it-IT', label: 'IT', bg: 'bg-green-600' },
};

const levels: { name: Level; desc: string; icon: string }[] = [
  { name: 'Basic', desc: 'Vocabulary only', icon: '📚' },
  { name: 'Moderate', desc: 'Day-to-day conversations', icon: '💬' },
  { name: 'Advanced', desc: 'Elevator pitch style', icon: '🎯' },
];

function stopSpeechGlobal() {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

function speakWithBestVoice(text: string, langCode: string) {
  if (typeof window === 'undefined') return;
  stopSpeechGlobal();
  try {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synth.getVoices();
    const prefix = langCode.split('-')[0].toLowerCase();
    const exact = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    utterance.voice = exact || prefixMatch || null;

    synth.speak(utterance);
  } catch (err) {
    console.error('TTS error', err);
  }
}

function playFeedbackSound(isCorrect: boolean) {
  if (typeof window === 'undefined') return;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = isCorrect ? 'sine' : 'sawtooth';
  osc.frequency.value = isCorrect ? 800 : 200;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ');

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function LanguageTutorApp() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [username, setUsername] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [skillBand, setSkillBand] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(AnswerRecord | null)[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionReports, setSessionReports] = useState<
    {
      band: number;
      level: Level | null;
      language: LanguageKey | null;
      answers: AnswerRecord[];
      score: number;
      total: number;
    }[]
  >([]);



  useEffect(() => {
    return () => {
      stopSpeechGlobal();
    };
  }, []);

  const generateQuestions = async (langKey: LanguageKey, level: Level, band: number) => {
    setLoading(true);
    setFetchError(null);
    stopSpeechGlobal();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/questions', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langKey,
          level,
          band,
          count: QUESTIONS_PER_BAND,
          requestId: `${Date.now()}-${Math.random()}`,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const jsonBody = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (jsonBody && (jsonBody as any).error) || `HTTP ${String(res.status)}`;
        throw new Error(message);
      }

      const data = jsonBody as Question[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('AI returned no questions');
      }

      const sanitized = data
        .filter((q) => q && typeof q.question === 'string' && typeof q.answer === 'string')
        .map<Question>((q) => {
          const direction: Question['direction'] =
            q.direction === 'target-to-en'
              ? 'target-to-en'
              : q.direction === 'target-to-target'
              ? 'target-to-target'
              : 'en-to-target';

          const questionLanguage: Question['questionLanguage'] =
            q.questionLanguage === 'target' ? 'target' : 'en';

          let type: Question['type'];
          if (q.type === 'fill-in-the-blanks') {
            type = 'fill-in-the-blanks';
          } else if (q.type === 'type-answer' || !q.options || q.options.length === 0) {
            type = 'type-answer';
          } else {
            type = 'multiple-choice';
          }

          let options: string[] | undefined;
          if (type === 'multiple-choice' || type === 'fill-in-the-blanks') {
            const baseOptions = Array.isArray(q.options) ? q.options.slice() : [];
            if (!baseOptions.includes(q.answer)) {
              baseOptions.push(q.answer);
            }
            const unique = Array.from(new Set(baseOptions.map(String)));
            const maxOptions = type === 'fill-in-the-blanks' ? 4 : 5;
            options = shuffle(unique).slice(0, maxOptions);
          }

          return {
            question: q.question,
            answer: q.answer,
            options,
            direction,
            type,
            questionLanguage,
            explanation: q.explanation,
          };
        })
        .slice(0, QUESTIONS_PER_BAND);

      if (!sanitized.length) {
        throw new Error('No usable questions from AI');
      }

      setQuestions(sanitized);
    } catch (err) {
      console.error('Question fetch failed', err);
      setQuestions([]);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

  const startBand = (langKey: LanguageKey, level: Level, band: number) => {
    setSkillBand(band);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    stopSpeechGlobal();
    setScreen('quiz');
    void generateQuestions(langKey, level, band);
  };

  const handleAnswer = (answer: string) => {
    const q = questions[currentQuestionIndex];
    if (!q) return;
    const isRight = normalize(answer) === normalize(q.answer);
    setIsCorrect(isRight);
    setShowResult(true);
    playFeedbackSound(isRight);

    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = {
        question: q.question,
        userAnswer: answer,
        correctAnswer: q.answer,
        correct: isRight,
        explanation: q.explanation,
      };
      return next;
    });

    if (isRight) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    stopSpeechGlobal();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setShowResult(false);
      setIsCorrect(false);
      setUserAnswer('');
      return;
    }

    // End of this skill band: store band result in sessionReports
    const answeredForBand = answers.filter((a): a is AnswerRecord => !!a);
    const totalForBand = questions.length;
    const bandEntry = {
      band: skillBand,
      level: selectedLevel,
      language: selectedLanguage,
      answers: answeredForBand,
      score,
      total: totalForBand,
    };

    setSessionReports((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.band === bandEntry.band &&
            r.level === bandEntry.level &&
            r.language === bandEntry.language
          ),
      );
      return [...filtered, bandEntry];
    });

    setScreen('report');
  };

  const handlePrevious = () => {
    stopSpeechGlobal();
    if (currentQuestionIndex === 0) return;
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    setShowResult(false);
    setIsCorrect(false);
    const prev = answers[prevIndex];
    setUserAnswer(prev?.userAnswer || '');
  };

  const resetSession = () => {
    stopSpeechGlobal();
    setScreen('welcome');
    setUsername('');
    setSelectedLanguage(null);
    setSelectedLevel(null);
    setSkillBand(1);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setQuestions([]);
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    setFetchError(null);
    setSessionReports([]);

  };

  const resetBand = () => {
    if (!selectedLanguage || !selectedLevel) return;
    startBand(selectedLanguage, selectedLevel, skillBand);
  };

  const resetLevelProgress = () => {
    if (!selectedLanguage || !selectedLevel) return;
    startBand(selectedLanguage, selectedLevel, 1);
  };

  const goToLevelSelection = () => {
  stopSpeechGlobal();
  setSkillBand(1);
  setCurrentQuestionIndex(0);
  setScore(0);
  setAnswers([]);
  setQuestions([]);
  setUserAnswer('');
  setShowResult(false);
  setIsCorrect(false);
  setFetchError(null);
  setSelectedLevel(null);
  setScreen('level');
  };


  const resetLanguageFlow = () => {
    stopSpeechGlobal();
    setSelectedLanguage(null);
    setSelectedLevel(null);
    setSkillBand(1);
    setCurrentQuestionIndex(0);
    setScore(0);
    setAnswers([]);
    setQuestions([]);
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    setFetchError(null);
    setSessionReports([]);
    setScreen('language');
  };

  const goToNextBand = () => {
    if (!selectedLanguage || !selectedLevel) return;
    if (skillBand >= 5) return;
    const nextBand = skillBand + 1;
    startBand(selectedLanguage, selectedLevel, nextBand);
  };


const handleDownloadPdf = async () => {
  if (typeof window === 'undefined') return;
  stopSpeechGlobal();

  try {
        const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const footerHeight = 15;
    let y = margin;

    const checkPageBreak = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - footerHeight) {
        // footer on previous page
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `Generated by Learnext AI Language Tutor on ${new Date().toLocaleString()}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        pdf.addPage();
        y = margin;
      }
    };

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Learnext Language Practice Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Header info
    const studentName = username || 'Learner';
    const langLabel = selectedLanguage || '-';
    const levelLabel = selectedLevel || '-';
    const dateLabel = new Date().toLocaleDateString();

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text(`Student: ${studentName}`, margin, y);
    pdf.text(`Language: ${langLabel}`, margin + 80, y);
    y += 6;
    pdf.text(`Level: ${levelLabel}`, margin, y);
    pdf.text(`Date: ${dateLabel}`, margin + 80, y);
    y += 10;

    // Overall performance
    const allAnswers = sessionReports.flatMap((r) => r.answers);
    const totalQuestions = allAnswers.length;
    const totalCorrect = allAnswers.filter((a) => a.correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text('Overall Performance', margin, y);
    y += 7;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    pdf.text(`Total Score: ${totalCorrect}/${totalQuestions}`, margin, y);
    pdf.text(`Accuracy: ${accuracy}%`, margin + 80, y);
    y += 10;

    const questionLineHeight = 5;
    const answerLineHeight = 5;
    const explanationLineHeight = 4;

    const sortedReports = [...sessionReports].sort((a, b) => a.band - b.band);

    sortedReports.forEach((report) => {
      if (!report) return;

      // Band header
      const bandHeaderHeight = 16;
      checkPageBreak(bandHeaderHeight);
      pdf.setFillColor(37, 99, 235);
      pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Skill Band ${report.band}`, margin + 4, y + 7);

      const bandAccuracy = report.total > 0 ? Math.round((report.score / report.total) * 100) : 0;
      pdf.text(
        `${report.score}/${report.total} (${bandAccuracy}%)`,
        pageWidth - margin - 4,
        y + 7,
        { align: 'right' }
      );
      y += 14;

      // Questions within band
      report.answers.forEach((ans: AnswerRecord | null, idx: number) => {
        if (!ans) return;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        const qText = `Q${idx + 1}: ${ans.question}`;
        const qLines = pdf.splitTextToSize(qText, contentWidth - 10);

        const yourAnswerText = `Your answer: ${ans.userAnswer || '—'}`;
        const correctAnswerText = !ans.correct ? `Correct answer: ${ans.correctAnswer}` : '';
        const explanationText = `Explanation: ${
          ans.explanation || 'The correct option best matches the meaning.'
        }`;
        const expLines = pdf.splitTextToSize(explanationText, contentWidth - 10);

        // Compute block height using SAME line heights as rendering
        let blockHeight = 6; // top padding
        blockHeight += qLines.length * questionLineHeight + 2;
        blockHeight += answerLineHeight; // your answer line
        if (!ans.correct) {
          blockHeight += answerLineHeight; // correct answer line
        }
        blockHeight += expLines.length * explanationLineHeight + 6; // explanation + bottom padding

        checkPageBreak(blockHeight + 4);

        const bg = ans.correct ? [220, 252, 231] : [254, 226, 226];
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, 'F');

        let innerY = y + 6;

        // Question lines
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        qLines.forEach((line: string) => {
          pdf.text(line, margin + 4, innerY);
          innerY += questionLineHeight;
        });
        innerY += 2;

        // Your answer
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(31, 41, 55);
        pdf.text(yourAnswerText, margin + 4, innerY);
        innerY += answerLineHeight;

        // Correct answer (only if wrong)
        if (!ans.correct) {
          pdf.setTextColor(185, 28, 28);
          pdf.text(correctAnswerText, margin + 4, innerY);
          innerY += answerLineHeight;
        }

        // Explanation
        pdf.setTextColor(75, 85, 99);
        expLines.forEach((line: string) => {
          pdf.text(line, margin + 4, innerY);
          innerY += explanationLineHeight;
        });

        innerY += 4; // bottom padding inside block
        y = innerY;
      });

      y += 4; // gap between bands
    });

    // Footer on last page
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Generated by Learnext AI Language Tutor on ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    pdf.save(`${selectedLanguage}-${selectedLevel}-Report-${Date.now()}.pdf`);
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Failed to generate PDF. Please try again.');
  }
};


  const UsernameHeader = () => (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-3 bg-indigo-600 text-white px-5 py-2 rounded-full shadow-lg">
      <User className="w-5 h-5" />
      <span className="font-semibold text-base">{username || 'Guest'}</span>
    </div>
  );

  // 1. Welcome screen
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🌍</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Learnext</h1>
            <p className="text-gray-800">Learn languages with AI</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && username.trim()) {
                  setScreen('language');
                }
              }}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-lg"
            />
            <button
              onClick={() => username.trim() && setScreen('language')}
              disabled={!username.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Language selection
  if (screen === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4 relative">
        <UsernameHeader />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Choose Your Language
          </h2>
          <p className="text-gray-800 text-center mb-8">Hello, {username || 'Guest'}! 👋</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {Object.entries(languages).map(([langKey, langData]) => (
              <button
                key={langKey}
                onClick={() => {
                  setSelectedLanguage(langKey as LanguageKey);
                  setScreen('level');
                }}
                className="p-5 rounded-2xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col items-center"
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-2 ${langData.bg}`}
                  >
                    {langData.label}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{langKey}</span>
                </div>
                <span className="text-sm text-gray-800">
                  {langKey} language track ({langData.code})
                </span>
              </button>
            ))}
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> For the best native accent, use Chrome on desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Level selection
  if (screen === 'level') {
    const langMeta = selectedLanguage ? languages[selectedLanguage] : null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4 relative">
        <UsernameHeader />
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <button
          onClick={resetLanguageFlow}
          className="inline-flex items-center text-sm text-gray-700 mb-4 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to language
        </button>

        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Choose Your Level
        </h2>
        <p className="text-gray-800 text-center mb-8">
          Learning {selectedLanguage || '...'}{' '}
          {langMeta && (
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ml-1 ${langMeta.bg}`}
            >
              {langMeta.label}
            </span>
          )}
        </p>
        {/* level cards remain as they are */}

          <div className="space-y-4">
            {levels.map((lv) => (
              <button
                key={lv.name}
                onClick={() => {
                  if (!selectedLanguage) return;
                  setSelectedLevel(lv.name);
                  setSkillBand(1);
                  setScreen('band');
                }}
                className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="text-4xl mr-4">{lv.icon}</div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{lv.name}</div>
                    <div className="text-gray-800">{lv.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. Band selection (skill band dropdown)
  if (screen === 'band') {
    const langMeta = selectedLanguage ? languages[selectedLanguage] : null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 relative">
        <UsernameHeader />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Choose your skill band
          </h2>
          <p className="text-gray-800 text-center mb-6">
            {selectedLanguage && (
              <>
                {selectedLanguage}{' '}
                {langMeta && (
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ml-1 ${langMeta.bg}`}
                  >
                    {langMeta.label}
                  </span>
                )}
              </>
            )}
            {selectedLevel && (
              <span className="block text-sm mt-1">
                Level: <strong>{selectedLevel}</strong>
              </span>
            )}
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Skill band (1 = easiest, 5 = hardest)
              </label>
              <select
                value={skillBand}
                onChange={(e) => setSkillBand(Number(e.target.value) || 1)}
                className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-gray-900 bg-white"
              >
                <option value={1}>Band 1 - Beginner</option>
                <option value={2}>Band 2 - Easy</option>
                <option value={3}>Band 3 - Intermediate</option>
                <option value={4}>Band 4 - Advanced</option>
                <option value={5}>Band 5 - Expert</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!selectedLanguage || !selectedLevel) return;
                startBand(selectedLanguage, selectedLevel, skillBand);
              }}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700"
            >
              Start this skill band
            </button>
            <button
              onClick={() => setScreen('level')}
              className="w-full bg-gray-100 text-gray-900 py-2 rounded-xl border border-gray-300 hover:bg-gray-200 text-sm"
            >
              Back to levels
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Quiz screen
  if (screen === 'quiz') {
    const langMeta = selectedLanguage ? languages[selectedLanguage] : null;
    const currentQ = questions[currentQuestionIndex];
    const progress =
      questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center relative">
          <UsernameHeader />
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">📚</div>
            <div className="text-2xl font-semibold text-gray-800">
              Preparing your questions...
            </div>
            <div className="text-gray-800 mt-2">
              Generating {QUESTIONS_PER_BAND} {selectedLevel} questions
            </div>
            <div className="text-gray-800">Skill band {skillBand} of 5</div>
          </div>
        </div>
      );
    }

    if (!loading && questions.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 relative">
          <UsernameHeader />
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Could not load this band</h2>
            <p className="text-gray-800 mb-2">
              Unable to load questions from the AI right now. Please check your connection or API
              quota and retry this skill band.
            </p>
            {fetchError && (
              <p className="text-xs text-gray-500 mb-4">Technical reason: {fetchError}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!selectedLanguage || !selectedLevel) return;
                  startBand(selectedLanguage, selectedLevel, skillBand);
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700"
              >
                Retry this skill band
              </button>
              <button
                onClick={resetLanguageFlow}
                className="w-full bg-gray-100 text-gray-900 py-2 rounded-xl border border-gray-300 hover:bg-gray-200"
              >
                Change language
              </button>
              <button
                onClick={resetSession}
                className="w-full bg-white text-gray-900 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                Back to welcome
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!currentQ) {
      return null;
    }

    const langMetaSafe = langMeta || languages.French;
    const questionLangCode =
      currentQ.questionLanguage === 'en' ? 'en-US' : langMetaSafe.code;
    const answerLangCode =
      currentQ.questionLanguage === 'en' ? langMetaSafe.code : 'en-US';

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 relative">
        <UsernameHeader />
        <div className="max-w-4xl mx-auto pt-16">
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {langMeta && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${langMeta.bg}`}
                  >
                    {langMeta.label}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {selectedLanguage} - {selectedLevel}
                  </div>
                  <div className="text-sm text-gray-800">Skill band {skillBand} of 5</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">
                  {score}/{questions.length}
                </div>
                <div className="text-sm text-gray-800">Score</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-sm text-gray-500 mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="flex items-center justify-center space-x-3">
                <h3 className="text-3xl font-bold text-gray-900">{currentQ.question}</h3>
                <button
                  onClick={() => speakWithBestVoice(currentQ.question, questionLangCode)}
                  className="p-3 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-all"
                  title="Listen to pronunciation"
                  type="button"
                >
                  <Volume2 className="w-6 h-6 text-indigo-600" />
                </button>
                <button
                  onClick={() => stopSpeechGlobal()}
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-all"
                  title="Stop audio"
                  type="button"
                >
                  <Square className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {currentQ.type === 'multiple-choice' || currentQ.type === 'fill-in-the-blanks' ? (
              <div className="space-y-3">
                {currentQ.options?.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !showResult && handleAnswer(option)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-xl border-2 text-left font-semibold transition-all flex items-center justify-between
                      ${
                        showResult && option === currentQ.answer
                          ? 'bg-green-100 border-green-500'
                          : ''
                      }
                      ${
                        showResult &&
                        answers[currentQuestionIndex]?.userAnswer === option &&
                        !answers[currentQuestionIndex]?.correct
                          ? 'bg-red-100 border-red-500'
                          : ''
                      }
                      ${
                        !showResult
                          ? 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
                          : 'cursor-default'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-lg text-gray-900">{option}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWithBestVoice(option, answerLangCode);
                        }}
                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer flex items-center justify-center"
                      >
                        <Volume2 className="w-4 h-4 text-gray-600" />
                      </span>
                    </div>
                    {showResult && option === currentQ.answer && (
                      <Check className="w-6 h-6 text-green-600" />
                    )}
                    {showResult &&
                      answers[currentQuestionIndex]?.userAnswer === option &&
                      !answers[currentQuestionIndex]?.correct && (
                        <X className="w-6 h-6 text-red-600" />
                      )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !showResult && userAnswer.trim()) {
                      handleAnswer(userAnswer);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-lg text-gray-900"
                  placeholder="Type your answer..."
                />
                {!showResult && (
                  <button
                    type="button"
                    onClick={() => userAnswer.trim() && handleAnswer(userAnswer)}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700"
                  >
                    Check answer
                  </button>
                )}

              </div>
            )}

            {showResult && (
              <div
                className={`mt-6 p-4 rounded-xl border-2 ${
                  isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {isCorrect ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Correct!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-700">Not quite</span>
                    </>
                  )}
                </div>
                {!isCorrect && (
                  <div className="text-sm text-gray-900">
                    Correct answer: <strong>{currentQ.answer}</strong>
                  </div>
                )}
                <div className="text-sm text-gray-900 mt-2">
                  <span className="font-semibold">Explanation:</span>{' '}
                  <span className="font-normal">
                    {answers[currentQuestionIndex]?.explanation ||
                      currentQ.explanation ||
                      'The correct answer best fits the meaning and natural usage in this context.'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-800 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Finish band' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>

            <div className="flex justify-between items-center mt-6 text-sm text-gray-700">
              <button onClick={resetBand} className="underline">
                Retry this skill band
             </button>
              <button onClick={goToLevelSelection} className="underline">
                Change level
              </button>
            <button onClick={resetLanguageFlow} className="underline">
                 Change language
            </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Report screen
  if (screen === 'report') {
    const total = questions.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const answered = answers.filter((a): a is AnswerRecord => !!a);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 relative">
        <UsernameHeader />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Skill Band summary</h2>
          <p className="text-gray-800 text-center mb-6">
            Skill band {skillBand} of 5 · {selectedLanguage} · {selectedLevel}
          </p>
          <div className="flex justify-around mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{score}</div>
              <div className="text-sm text-gray-800">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-800">Total questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-sm text-gray-800">Accuracy</div>
            </div>
          </div>
                    <div className="max-h-80 overflow-y-auto mb-6 space-y-2">
            {answered.map((a, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-sm ${
                  a.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">
                  Q{idx + 1}: {a.question}
                </div>
                <div className="text-gray-800">
                  Your answer: <span className="font-medium">{a.userAnswer || '—'}</span>
                </div>
                {!a.correct && (
                  <div className="text-gray-800">
                    Correct: <span className="font-medium">{a.correctAnswer}</span>
                  </div>
                )}
                <div className="text-gray-800 mt-1">
                  Explanation:{' '}
                  <span className="font-normal">
                    {a.explanation ||
                      'The correct answer best fits the meaning and natural usage in this context.'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={resetBand}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700"
            >
              Retry this skill band
            </button>
            <button
              type="button"
              onClick={goToLevelSelection}
              className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-200"
            >
              Change Level
            </button>
            {skillBand < 5 && (
              <button
                type="button"
                onClick={goToNextBand}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                Go to next skill band
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
  <button
    type="button"
    onClick={handleDownloadPdf}
    className="w-full md:w-auto bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
  >
    <Download className="w-5 h-5" />
    Download Full Report as PDF
  </button>
  <p className="mt-2 text-sm text-gray-600 text-center">
    Download includes all {sessionReports.length} band{sessionReports.length !== 1 ? 's' : ''} completed in this session
  </p>
</div>

          <button
            type="button"
            onClick={resetLanguageFlow}
            className="w-full mt-4 text-sm text-gray-800 underline"
          >
            Change language
          </button>
   </div>
      </div>
    );
  }

  return null;
}
