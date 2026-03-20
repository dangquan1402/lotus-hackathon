import { useState, useEffect } from 'react';
import { api, type QuizQuestion, type QuizResult } from '../api/client';

interface QuizPanelProps {
  sessionId: number;
}

type QuizState = 'loading' | 'answering' | 'submitting' | 'results' | 'error' | 'empty';

export default function QuizPanel({ sessionId }: QuizPanelProps) {
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      try {
        const data = await api.getQuiz(sessionId);
        if (cancelled) return;
        if (!data.questions || data.questions.length === 0) {
          setQuizState('empty');
        } else {
          setQuestions(data.questions);
          setQuizState('answering');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load quiz.');
          setQuizState('error');
        }
      }
    }

    loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function selectAnswer(questionId: number, optionId: number) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function goToNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goToPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  async function handleSubmit() {
    setQuizState('submitting');
    // Build ordered answers array matching question order
    const answers = questions.map((q) => selectedAnswers[q.id] ?? -1);
    try {
      const data = await api.submitQuiz(sessionId, answers);
      setResult(data);
      setQuizState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz.');
      setQuizState('error');
    }
  }

  function handleRetry() {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setQuizState('answering');
  }

  // ─── Render states ────────────────────────────────────────────────────────

  if (quizState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading quiz questions…</p>
      </div>
    );
  }

  if (quizState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load quiz</h3>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (quizState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <span className="text-5xl mb-4">🧠</span>
        <h3 className="text-lg font-semibold text-white mb-2">No quiz available yet</h3>
        <p className="text-slate-400 text-sm">Quiz questions will appear here once the session content is ready.</p>
      </div>
    );
  }

  if (quizState === 'results' && result) {
    return <QuizResults result={result} questions={questions} selectedAnswers={selectedAnswers} onRetry={handleRetry} />;
  }

  if (quizState === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Submitting your answers…</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === questions.length;
  const currentAnswer = selectedAnswers[currentQuestion.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-medium text-sm">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-slate-600 text-sm">•</span>
          <span className="text-slate-500 text-sm">{answeredCount} answered</span>
        </div>
        <span className="text-sm text-slate-500">
          {Math.round((answeredCount / questions.length) * 100)}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#2d2d4e] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6 sm:p-8">
        <p className="text-white text-lg font-medium mb-6 leading-relaxed">
          {currentQuestion.question}
        </p>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              onClick={() => selectAnswer(currentQuestion.id, option.id)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all flex items-start gap-4 cursor-pointer ${
                currentAnswer === option.id
                  ? 'bg-indigo-500/15 border-indigo-500 text-white'
                  : 'bg-[#0f0f1a] border-[#2d2d4e] text-slate-300 hover:border-slate-500 hover:bg-[#16213e]'
              }`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  currentAnswer === option.id
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-slate-600'
                }`}
              >
                {currentAnswer === option.id && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
              <span className="leading-relaxed">{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2d2d4e] text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-indigo-500 scale-125'
                  : selectedAnswers[questions[i].id] !== undefined
                    ? 'bg-indigo-500/40'
                    : 'bg-[#2d2d4e]'
              }`}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            Submit Quiz →
          </button>
        ) : (
          <button
            onClick={goToNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2d2d4e] text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            Next →
          </button>
        )}
      </div>

      {!allAnswered && isLastQuestion && (
        <p className="text-center text-slate-500 text-sm">
          Answer all {questions.length} questions to submit.{' '}
          {questions.length - answeredCount} remaining.
        </p>
      )}
    </div>
  );
}

function QuizResults({
  result,
  questions,
  selectedAnswers,
  onRetry,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  selectedAnswers: Record<number, number>;
  onRetry: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pct = result.percentage;
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
          You got{' '}
          <span className="text-white font-semibold">{result.score}</span> out of{' '}
          <span className="text-white font-semibold">{result.total}</span> questions correct.
        </p>

        <button
          onClick={onRetry}
          className="mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>

      {/* Question-by-question review */}
      <div className="space-y-3">
        <h4 className="text-white font-semibold text-lg">Review</h4>
        {questions.map((question, i) => {
          const questionResult = result.results.find((r) => r.question_id === question.id);
          const isCorrect = questionResult?.correct ?? false;
          const isExpanded = expandedId === question.id;
          const userAnswer = selectedAnswers[question.id];
          const correctAnswerId = questionResult?.correct_answer;

          return (
            <div
              key={question.id}
              className={`bg-[#1a1a2e] border rounded-xl overflow-hidden ${
                isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : question.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCorrect
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isCorrect ? '✓' : '✗'}
                </span>
                <span className="flex-1 text-slate-200 text-sm font-medium">
                  Q{i + 1}. {question.question}
                </span>
                <span className={`text-slate-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#2d2d4e]">
                  <div className="mt-4 space-y-2">
                    {question.options.map((option) => {
                      const isUserChoice = userAnswer === option.id;
                      const isCorrectChoice = correctAnswerId === option.id;

                      let className =
                        'flex items-start gap-3 px-4 py-3 rounded-xl text-sm ';
                      if (isCorrectChoice) {
                        className += 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300';
                      } else if (isUserChoice && !isCorrectChoice) {
                        className += 'bg-red-500/10 border border-red-500/30 text-red-300';
                      } else {
                        className += 'bg-[#0f0f1a] border border-[#2d2d4e] text-slate-400';
                      }

                      return (
                        <div key={option.id} className={className}>
                          <span className="flex-shrink-0 mt-0.5">
                            {isCorrectChoice ? '✓' : isUserChoice ? '✗' : '○'}
                          </span>
                          <span>{option.text}</span>
                          {isUserChoice && !isCorrectChoice && (
                            <span className="ml-auto text-xs text-red-400 flex-shrink-0">Your answer</span>
                          )}
                          {isCorrectChoice && (
                            <span className="ml-auto text-xs text-emerald-400 flex-shrink-0">Correct</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {questionResult?.explanation && (
                    <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">
                        Explanation
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {questionResult.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
