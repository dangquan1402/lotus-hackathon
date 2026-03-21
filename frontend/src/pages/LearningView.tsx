import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Session } from '../api/client';
import VideoPlayer from '../components/VideoPlayer';
import SlideViewer from '../components/SlideViewer';
import QuizPanel from '../components/QuizPanel';
import MindMap from '../components/MindMap';

type Tab = 'video' | 'slides' | 'quiz' | 'mindmap';

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
  {
    id: 'mindmap',
    label: 'Mind Map',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 2v8m0 4v8M2 12h8m4 0h8" />
        <circle cx="4" cy="4" r="1.5" strokeWidth={2} />
        <circle cx="20" cy="4" r="1.5" strokeWidth={2} />
        <circle cx="4" cy="20" r="1.5" strokeWidth={2} />
        <circle cx="20" cy="20" r="1.5" strokeWidth={2} />
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--forest)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--muted)' }}>Loading your lesson…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.2)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--rose)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
            Something went wrong
          </h2>
          <p className="mb-6" style={{ color: 'var(--muted)' }}>{error ?? 'Session not found.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="font-semibold px-6 py-2.5 rounded-xl transition-all"
            style={{ background: 'var(--forest)', color: '#fdf8f0' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/explore')}
              className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div className="h-4 w-px hidden sm:block" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              <span className="text-lg hidden sm:block">💎</span>
              <span className="font-bold text-base hidden sm:block" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
                Lotus
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!hasVideo && !generatingAll && (
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#fff', boxShadow: '0 4px 12px rgba(200,150,62,0.3)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
                Generate All
              </button>
            )}
            {generatingAll && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                Generating…
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--gold)', color: '#fff' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm hidden sm:block" style={{ color: 'var(--muted)' }}>{userName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-screen-xl mx-auto w-full">

        {/* Left Sidebar: Content Overview */}
        <aside className="lg:w-[350px] lg:min-w-[350px] lg:max-w-[350px] border-b lg:border-b-0 lg:border-r lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="p-5 space-y-5">

            {/* Lesson title + topic */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--gold)' }}>
                {session.topic}
              </p>
              <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
                {content?.title ?? session.topic}
              </h1>
            </div>

            {/* Overview */}
            {content?.overview && (
              <div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{content.overview}</p>
              </div>
            )}

            {/* Artifact status row */}
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted)' }}>Content</p>

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
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
                {generateAllError}
              </div>
            )}

            {/* Sections list */}
            {sections.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-2.5" style={{ color: 'var(--muted)' }}>
                  Sections ({sections.length})
                </p>
                <div className="space-y-1.5">
                  {sections.map((sec, i) => {
                    const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
                    const isOpen = expandedSections.has(i);
                    return (
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(i)}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold"
                              style={{ background: 'rgba(30,58,47,0.12)', color: 'var(--forest)' }}>
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{sec.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs tabular-nums" style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>{wordCount}w</span>
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              style={{ color: 'var(--muted)' }}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5">
                            <p className="text-xs leading-relaxed pt-3" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
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

            {/* Concepts Learned */}
            {session.concepts_learned && session.concepts_learned.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-2.5" style={{ color: 'var(--muted)' }}>
                  Concepts Learned
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {session.concepts_learned.map((concept, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(30,58,47,0.08)', color: 'var(--forest)', border: '1px solid rgba(30,58,47,0.15)' }}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sources / References */}
            {session.search_results && session.search_results.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-2.5" style={{ color: 'var(--muted)' }}>
                  Sources ({session.search_results.length})
                </p>
                <div className="space-y-1.5">
                  {session.search_results.map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-lg px-3 py-2 transition-all hover:-translate-y-0.5 group"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    >
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors" style={{ color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate group-hover:underline" style={{ color: 'var(--text)' }}>
                          {source.title || new URL(source.url).hostname}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {new URL(source.url).hostname}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          <div className="px-4 sm:px-6 flex gap-1 sticky top-[57px] z-10"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all"
                style={activeTab === tab.id
                  ? { borderBottomColor: 'var(--forest)', color: 'var(--forest)' }
                  : { borderBottomColor: 'transparent', color: 'var(--muted)' }}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'video' && hasVideo && (
                  <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: 'var(--forest)' }} />
                )}
                {tab.id === 'slides' && hasSlides && (
                  <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: 'var(--forest)' }} />
                )}
                {tab.id === 'quiz' && hasQuiz && (
                  <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: 'var(--forest)' }} />
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
                imagePaths={session.image_paths ?? undefined}
                onSlidesGenerated={(url) => handleSessionUpdate({ slides_path: url })}
              />
            )}
            {activeTab === 'quiz' && (
              <QuizPanel sessionId={numericSessionId} />
            )}
            {activeTab === 'mindmap' && (
              <MindMap
                topic={session.topic}
                sections={sections}
                concepts={session.concepts_learned ?? undefined}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Artifact Status Row

interface ArtifactStatusRowProps {
  label: string;
  ready: boolean;
  icon: React.ReactNode;
  onGenerate: () => void;
  generateLabel: string;
}

function ArtifactStatusRow({ label, ready, icon, onGenerate, generateLabel }: ArtifactStatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5">
        <span style={{ color: ready ? 'var(--forest)' : 'var(--muted)' }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
      </div>
      {ready ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--forest)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Ready
        </span>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="text-xs font-semibold transition-colors hover:underline"
          style={{ color: 'var(--gold)' }}
        >
          {generateLabel} →
        </button>
      )}
    </div>
  );
}
