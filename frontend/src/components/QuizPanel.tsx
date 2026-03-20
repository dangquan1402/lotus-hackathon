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
        const qs = Array.isArray(data) ? data : (data as { questions?: Question[] }).questions || [];
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
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--forest)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--muted)' }}>{quizState === 'loading' ? 'Loading quiz…' : 'Submitting…'}</p>
      </div>
    );
  }

  if (quizState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{error}</p>
      </div>
    );
  }

  if (quizState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-5xl mb-4">🧠</span>
        <h3 className="text-lg font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
          No quiz available
        </h3>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Quiz questions will appear once content is ready.</p>
      </div>
    );
  }

  if (quizState === 'results' && result) {
    const pct = result.score;
    const grade = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep going!' : 'Keep studying!';
    const gradeColor = pct >= 90 ? 'var(--forest)' : pct >= 70 ? 'var(--sky)' : pct >= 50 ? 'var(--gold)' : 'var(--rose)';

    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, var(--forest), var(--forest-light))', border: '1px solid var(--forest)' }}>
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
            style={{ background: 'rgba(253,248,240,0.15)', border: '2px solid rgba(253,248,240,0.3)' }}>
            <span className="text-4xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#fdf8f0' }}>
              {Math.round(pct)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: gradeColor === 'var(--forest)' ? '#fdf8f0' : gradeColor }}>
            {grade}
          </h3>
          <p style={{ color: 'rgba(253,248,240,0.7)' }}>
            <span className="font-bold" style={{ color: '#fdf8f0' }}>{result.correct}</span> out of{' '}
            <span className="font-bold" style={{ color: '#fdf8f0' }}>{result.total}</span> correct
          </p>
          <button onClick={handleRetry}
            className="mt-6 font-semibold px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--gold)', color: '#fff', boxShadow: '0 4px 12px rgba(200,150,62,0.4)' }}>
            Try Again
          </button>
        </div>

        {/* Review */}
        <div className="space-y-3">
          <h4 className="font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>Review</h4>
          {result.results.map((r, qi) => {
            const q = questions[qi];
            return (
              <div key={qi} className="rounded-xl p-5"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${r.is_correct ? 'rgba(30,58,47,0.3)' : 'rgba(196,92,92,0.3)'}`,
                }}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={r.is_correct
                      ? { background: 'rgba(30,58,47,0.12)', color: 'var(--forest)' }
                      : { background: 'rgba(196,92,92,0.12)', color: 'var(--rose)' }}>
                    {r.is_correct ? '✓' : '✗'}
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>{q.question}</span>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === r.correct_index;
                    const isUserChoice = oi === r.submitted_index;
                    let style: React.CSSProperties = {
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    };
                    if (isCorrect) {
                      style = { ...style, background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.25)', color: 'var(--forest)' };
                    } else if (isUserChoice) {
                      style = { ...style, background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.25)', color: 'var(--rose)' };
                    } else {
                      style = { ...style, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' };
                    }

                    return (
                      <div key={oi} style={style}>
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)})</span>
                        {opt}
                        {isCorrect && <span className="ml-2 text-xs" style={{ color: 'var(--forest)' }}>✓ Correct</span>}
                        {isUserChoice && !isCorrect && <span className="ml-2 text-xs" style={{ color: 'var(--rose)' }}>Your answer</span>}
                      </div>
                    );
                  })}
                </div>
                {r.explanation && (
                  <div className="mt-3 ml-10 rounded-lg px-4 py-2.5"
                    style={{ background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.2)' }}>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{r.explanation}</p>
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
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>{answeredCount} answered</span>
      </div>
      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(answeredCount / questions.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--forest), var(--gold))',
          }} />
      </div>

      {/* Question */}
      <div className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt, oi) => (
            <button key={oi} onClick={() => selectAnswer(oi)}
              className="w-full text-left px-5 py-4 rounded-xl border transition-all flex items-start gap-4"
              style={answers[currentIndex] === oi
                ? { background: 'rgba(30,58,47,0.08)', border: '1px solid var(--forest)', color: 'var(--forest)' }
                : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={answers[currentIndex] === oi
                  ? { borderColor: 'var(--forest)', background: 'var(--forest)' }
                  : { borderColor: 'var(--border)' }}>
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
          className="px-4 py-2.5 rounded-xl border transition-all disabled:opacity-30 font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
          ← Previous
        </button>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: i === currentIndex ? '12px' : '10px',
                height: i === currentIndex ? '12px' : '10px',
                transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
                background: i === currentIndex
                  ? 'var(--forest)'
                  : answers[i] !== null
                    ? 'rgba(30,58,47,0.4)'
                    : 'var(--border)',
              }} />
          ))}
        </div>
        {isLast ? (
          <button onClick={handleSubmit} disabled={!allAnswered}
            className="font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 12px rgba(30,58,47,0.25)' }}>
            Submit →
          </button>
        ) : (
          <button onClick={() => setCurrentIndex(i => i + 1)}
            className="px-4 py-2.5 rounded-xl border transition-all font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
