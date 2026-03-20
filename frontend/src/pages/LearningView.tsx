import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Session } from '../api/client';
import VideoPlayer from '../components/VideoPlayer';
import SlideViewer from '../components/SlideViewer';
import QuizPanel from '../components/QuizPanel';

type Tab = 'video' | 'slides' | 'quiz';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'video', label: 'Video', icon: '▶' },
  { id: 'slides', label: 'Slides', icon: '📊' },
  { id: 'quiz', label: 'Quiz', icon: '🧠' },
];

export default function LearningView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('video');

  const numericSessionId = parseInt(sessionId ?? '', 10);
  const userName = localStorage.getItem('lotus_user_name') ?? 'Learner';

  useEffect(() => {
    if (isNaN(numericSessionId)) {
      setError('Invalid session ID.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSession() {
      try {
        const data = await api.getSession(numericSessionId);
        if (!cancelled) {
          setSession(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load session.');
          setLoading(false);
        }
      }
    }

    fetchSession();
    return () => {
      cancelled = true;
    };
  }, [numericSessionId]);

  function handleSessionUpdate(updates: Partial<Session>) {
    setSession((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your lesson…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error ?? 'Session not found.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            ← Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2d2d4e] bg-[#0f0f1a]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/explore')}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0 flex items-center gap-1 text-sm"
            >
              ← Back
            </button>
            <div className="h-4 w-px bg-[#2d2d4e]" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold truncate">{session.topic}</h1>
              {session.generated_content?.overview && (
                <p className="text-slate-500 text-xs truncate mt-0.5">{session.generated_content.overview}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-300 text-sm hidden sm:block">{userName}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {activeTab === 'video' && (
          <VideoPlayer
            sessionId={numericSessionId}
            videoUrl={session.video_path ? `/api/files/session_${numericSessionId}/video/lesson_${numericSessionId}.mp4` : undefined}
            onVideoGenerated={(url) => handleSessionUpdate({ video_path: url })}
          />
        )}
        {activeTab === 'slides' && (
          <SlideViewer
            sessionId={numericSessionId}
            slidesUrl={session.slides_path ? `/api/files/session_${numericSessionId}/slides/lesson_${numericSessionId}.pptx` : undefined}
            onSlidesGenerated={(url) => handleSessionUpdate({ slides_path: url })}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizPanel sessionId={numericSessionId} />
        )}
      </main>
    </div>
  );
}
