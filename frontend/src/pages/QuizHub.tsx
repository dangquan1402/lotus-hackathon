import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Session } from '../api/client';

interface QuizSession {
  session: Session;
  questionCount: number;
}

export default function QuizHub() {
  const navigate = useNavigate();
  const userId = parseInt(localStorage.getItem('lotus_user_id') ?? '0', 10);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchQuizzes() {
      try {
        const sessions = await api.listSessions(userId);
        const completed = sessions.filter((s) => s.status === 'completed');

        const results: QuizSession[] = [];
        for (const s of completed) {
          try {
            const full = await api.getSession(s.id);
            const questions = full.generated_content?.quiz_questions;
            if (questions && questions.length > 0) {
              results.push({ session: full, questionCount: questions.length });
            }
          } catch {
            // skip sessions that fail to load
          }
        }
        setQuizSessions(results);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading quizzes…
          </p>
        </div>
      </div>
    );
  }

  if (quizSessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(200,150,62,0.12)' }}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--heading)' }}
          >
            No quizzes yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            Explore a topic first — once your learning materials are ready, quizzes will appear here for you to test your knowledge.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, var(--gold), #d4a843)',
              color: '#1e3a2f',
            }}
          >
            Explore Topics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--heading)' }}
        >
          Quiz Hub
        </h1>
        <p style={{ color: 'var(--muted)' }}>
          Test your knowledge on topics you've explored.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {quizSessions.map(({ session, questionCount }) => (
          <div
            key={session.id}
            className="rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
            onClick={() => navigate(`/learn/${session.id}`)}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(200,150,62,0.12)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h3
              className="text-lg font-semibold mb-1 line-clamp-2"
              style={{ color: 'var(--heading)' }}
            >
              {session.generated_content?.title || session.topic}
            </h3>

            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {questionCount} question{questionCount !== 1 ? 's' : ''}
            </p>

            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'rgba(200,150,62,0.15)',
                color: 'var(--gold)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/learn/${session.id}`);
              }}
            >
              Take Quiz &rarr;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
