import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface QuizPanelProps {
  sessionId: number;
}

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface ScoreResult {
  total: number;
  correct: number;
  score: number;
  results: {
    question_index: number;
    question: string;
    submitted_index: number;
    correct_index: number;
    is_correct: boolean;
    explanation: string;
  }[];
}

type QuizState = 'loading' | 'answering' | 'submitting' | 'results' | 'error' | 'empty';

export default function QuizPanel({ sessionId }: QuizPanelProps) {
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getQuiz(sessionId);
        if (cancelled) return;
        // Backend returns list of question dicts directly
        const qs = Array.isArray(data) ? data : data.questions || [];
        if (qs.length === 0) {
          setQuizState('empty');
        } else {
          setQuestions(qs);
          setAnswers(new Array(qs.length).fill(null));
          setQuizState('answering');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load quiz.');
          setQuizState('error');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  function selectAnswer(optionIndex: number) {
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  }

  async function handleSubmit() {
    setQuizState('submitting');
    try {
      const data = await api.submitQuiz(sessionId, answers.map(a => a ?? -1));
      setResult(data as unknown as ScoreResult);
      setQuizState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit.');
      setQuizState('error');
    }
  }

  function handleRetry() {
    setAnswers(new Array(questions.length).fill(null));
    setCurrentIndex(0);
    setResult(null);
    setQuizState('answering');
  }

  if (quizState === 'loading' || quizState === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">{quizState === 'loading' ? 'Loading quiz…' : 'Submitting…'}</p>
      </div>
    );
  }

  if (quizState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (quizState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <span className="text-5xl mb-4">🧠</span>
        <h3 className="text-lg font-semibold text-white mb-2">No quiz available</h3>
        <p className="text-slate-400 text-sm">Quiz questions will appear once content is ready.</p>
      </div>
    );
  }

  if (quizState === 'results' && result) {
    const pct = result.score;
    const grade = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep going!' : 'Keep studying!';
    const gradeColor = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-indigo-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 mb-4">
            <span className="text-4xl font-bold text-white">{Math.round(pct)}%</span>
          </div>
          <h3 className={`text-2xl font-bold mb-1 ${gradeColor}`}>{grade}</h3>
          <p className="text-slate-400">
            <span className="text-white font-semibold">{result.correct}</span> out of{' '}
            <span className="text-white font-semibold">{result.total}</span> correct
          </p>
          <button onClick={handleRetry}
            className="mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">
            Try Again
          </button>
        </div>

        {/* Review */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-lg">Review</h4>
          {result.results.map((r, qi) => {
            const q = questions[qi];
            return (
              <div key={qi} className={`bg-[#1a1a2e] border rounded-xl p-5 ${r.is_correct ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    r.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {r.is_correct ? '✓' : '✗'}
                  </span>
                  <span className="text-white font-medium">{q.question}</span>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === r.correct_index;
                    const isUserChoice = oi === r.submitted_index;
                    let cls = 'px-4 py-2.5 rounded-lg text-sm ';
                    if (isCorrect) cls += 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300';
                    else if (isUserChoice) cls += 'bg-red-500/10 border border-red-500/30 text-red-300';
                    else cls += 'bg-[#0f0f1a] border border-[#2d2d4e] text-slate-500';

                    return (
                      <div key={oi} className={cls}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + oi)})</span>
                        {opt}
                        {isCorrect && <span className="ml-2 text-xs text-emerald-400">✓ Correct</span>}
                        {isUserChoice && !isCorrect && <span className="ml-2 text-xs text-red-400">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
                {r.explanation && (
                  <div className="mt-3 ml-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2.5">
                    <p className="text-slate-300 text-sm">{r.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Answering state
  const q = questions[currentIndex];
  const answeredCount = answers.filter(a => a !== null).length;
  const allAnswered = answeredCount === questions.length;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-slate-300 font-medium text-sm">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-slate-500 text-sm">{answeredCount} answered</span>
      </div>
      <div className="w-full bg-[#2d2d4e] rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6 sm:p-8">
        <p className="text-white text-lg font-medium mb-6">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt, oi) => (
            <button key={oi} onClick={() => selectAnswer(oi)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all flex items-start gap-4 ${
                answers[currentIndex] === oi
                  ? 'bg-indigo-500/15 border-indigo-500 text-white'
                  : 'bg-[#0f0f1a] border-[#2d2d4e] text-slate-300 hover:border-slate-500'
              }`}>
              <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                answers[currentIndex] === oi ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
              }`}>
                {answers[currentIndex] === oi && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              <span>{String.fromCharCode(65 + oi)}) {opt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentIndex(i => i - 1)} disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl border border-[#2d2d4e] text-slate-400 hover:text-white transition-all disabled:opacity-30">
          ← Previous
        </button>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-indigo-500 scale-125'
                  : answers[i] !== null ? 'bg-indigo-500/40' : 'bg-[#2d2d4e]'
              }`} />
          ))}
        </div>
        {isLast ? (
          <button onClick={handleSubmit} disabled={!allAnswered}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Submit →
          </button>
        ) : (
          <button onClick={() => setCurrentIndex(i => i + 1)}
            className="px-4 py-2.5 rounded-xl border border-[#2d2d4e] text-slate-400 hover:text-white transition-all">
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
