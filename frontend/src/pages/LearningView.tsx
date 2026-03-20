import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Session } from '../api/client';
import VideoPlayer from '../components/VideoPlayer';
import SlideViewer from '../components/SlideViewer';
import QuizPanel from '../components/QuizPanel';

type Tab = 'video' | 'slides' | 'quiz';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'video',
    label: 'Video',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'slides',
    label: 'Slides',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

export default function LearningView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('video');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllError, setGenerateAllError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

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

  function toggleSection(index: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    setGenerateAllError(null);
    try {
      const result = await api.generateAll(numericSessionId);
      handleSessionUpdate({ video_path: result.video_url ?? 'done' });
      setActiveTab('video');
    } catch (err) {
      setGenerateAllError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGeneratingAll(false);
    }
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
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error ?? 'Session not found.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const content = session.generated_content;
  const sections = content?.sections ?? [];
  const hasVideo = !!session.video_path;
  const hasSlides = !!session.slides_path;
  const hasQuiz = (content?.quiz_questions?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2d2d4e] bg-[#0f0f1a]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/explore')}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0 flex items-center gap-1.5 text-sm hover:bg-[#2d2d4e] px-3 py-1.5 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div className="h-4 w-px bg-[#2d2d4e] hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-lg hidden sm:block">🪷</span>
              <span className="font-bold text-white text-base hidden sm:block">Lotus</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!hasVideo && !generatingAll && (
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
                Generate All
              </button>
            )}
            {generatingAll && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Generating…
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-300 text-sm hidden sm:block">{userName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-screen-xl mx-auto w-full">

        {/* ── Left Sidebar: Content Overview ───────────────────────────────────── */}
        <aside className="lg:w-[350px] lg:min-w-[350px] lg:max-w-[350px] border-b lg:border-b-0 lg:border-r border-[#2d2d4e] bg-[#0f0f1a]/50 lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Lesson title + topic */}
            <div>
              <p className="text-indigo-400 text-xs font-medium uppercase tracking-wider mb-1">{session.topic}</p>
              <h1 className="text-white text-xl font-bold leading-tight">
                {content?.title ?? session.topic}
              </h1>
            </div>

            {/* Overview */}
            {content?.overview && (
              <div>
                <p className="text-slate-300 text-sm leading-relaxed">{content.overview}</p>
              </div>
            )}

            {/* Artifact status row */}
            <div className="space-y-2.5">
              <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Content</p>

              {/* Video status */}
              <ArtifactStatusRow
                label="Video"
                ready={hasVideo}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                onGenerate={() => setActiveTab('video')}
                generateLabel="Generate"
              />

              {/* Slides status */}
              <ArtifactStatusRow
                label="Slides"
                ready={hasSlides}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                }
                onGenerate={() => setActiveTab('slides')}
                generateLabel="Generate"
              />

              {/* Quiz status */}
              <ArtifactStatusRow
                label="Quiz"
                ready={hasQuiz}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                onGenerate={() => setActiveTab('quiz')}
                generateLabel="Take Quiz"
              />
            </div>

            {/* Generate All error */}
            {generateAllError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {generateAllError}
              </div>
            )}

            {/* Sections list */}
            {sections.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2.5">
                  Sections ({sections.length})
                </p>
                <div className="space-y-1.5">
                  {sections.map((sec, i) => {
                    const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
                    const isOpen = expandedSections.has(i);
                    return (
                      <div
                        key={i}
                        className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(i)}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-[#2d2d4e]/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                              {i + 1}
                            </span>
                            <span className="text-slate-200 text-sm font-medium truncate">{sec.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-600 text-xs tabular-nums">{wordCount}w</span>
                            <svg
                              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5">
                            <p className="text-slate-400 text-xs leading-relaxed border-t border-[#2d2d4e] pt-3">
                              {sec.narration_text}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Content Area ──────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          <div className="border-b border-[#2d2d4e] bg-[#0f0f1a]/80 px-4 sm:px-6 flex gap-1 sticky top-[57px] z-10 backdrop-blur-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'video' && hasVideo && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                )}
                {tab.id === 'slides' && hasSlides && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                )}
                {tab.id === 'quiz' && hasQuiz && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-4 sm:p-6">
            {activeTab === 'video' && (
              <VideoPlayer
                sessionId={numericSessionId}
                videoUrl={
                  session.video_path
                    ? `/api/files/session_${numericSessionId}/video/lesson_${numericSessionId}.mp4`
                    : undefined
                }
                onVideoGenerated={(url) => handleSessionUpdate({ video_path: url })}
              />
            )}
            {activeTab === 'slides' && (
              <SlideViewer
                sessionId={numericSessionId}
                slidesUrl={
                  session.slides_path
                    ? `/api/files/session_${numericSessionId}/slides/lesson_${numericSessionId}.pptx`
                    : undefined
                }
                sections={sections}
                onSlidesGenerated={(url) => handleSessionUpdate({ slides_path: url })}
              />
            )}
            {activeTab === 'quiz' && (
              <QuizPanel sessionId={numericSessionId} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Artifact Status Row ──────────────────────────────────────────────────────

interface ArtifactStatusRowProps {
  label: string;
  ready: boolean;
  icon: React.ReactNode;
  onGenerate: () => void;
  generateLabel: string;
}

function ArtifactStatusRow({ label, ready, icon, onGenerate, generateLabel }: ArtifactStatusRowProps) {
  return (
    <div className="flex items-center justify-between bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`${ready ? 'text-emerald-400' : 'text-slate-500'}`}>{icon}</span>
        <span className="text-slate-300 text-sm font-medium">{label}</span>
      </div>
      {ready ? (
        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Ready
        </span>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors hover:underline"
        >
          {generateLabel} →
        </button>
      )}
    </div>
  );
}
