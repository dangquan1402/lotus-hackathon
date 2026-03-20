import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Session, type ContentMode, type ImageStyle } from '../api/client';

const IMAGE_STYLE_PILLS: { value: ImageStyle; label: string }[] = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'photorealistic', label: 'Photo' },
  { value: 'minimalist', label: 'Minimal' },
  { value: 'anime', label: 'Anime' },
  { value: 'scientific', label: 'Science' },
  { value: '3d_render', label: '3D' },
];

const LOADING_STEPS = [
  { label: 'Searching the web…', duration: 3000 },
  { label: 'Synthesizing content…', duration: 4000 },
  { label: 'Generating learning materials…', duration: 3000 },
];

export default function TopicExplore() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<ContentMode>('short');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const userName = localStorage.getItem('lotus_user_name') ?? 'Learner';
  const userId = parseInt(localStorage.getItem('lotus_user_id') ?? '0', 10);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [imageStyle, setImageStyle] = useState<ImageStyle>(
    (localStorage.getItem('lotus_image_style') as ImageStyle | null) ?? 'cartoon'
  );

  useEffect(() => {
    if (userId) {
      api.listSessions(userId).then(setSessions).catch(() => {});
      api.getUser(userId).then((user) => {
        if (user.image_style) {
          const stored = localStorage.getItem('lotus_image_style');
          if (!stored) {
            setImageStyle(user.image_style as ImageStyle);
          }
        }
      }).catch(() => {});
    }
  }, [userId]);

  // Cycle through loading step messages
  useEffect(() => {
    if (!loading) return;
    setStepIndex(0);
    let current = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    LOADING_STEPS.forEach((_step, i) => {
      const delay = LOADING_STEPS.slice(0, i).reduce((acc, s) => acc + s.duration, 0);
      const t = setTimeout(() => {
        current = i;
        setStepIndex(current);
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem('lotus_image_style', imageStyle);
      const result = await api.exploreTopic({ user_id: userId, topic: topic.trim(), mode, image_style: imageStyle });
      navigate(`/learn/${result.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to explore topic. Please try again.');
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('lotus_user_id');
    localStorage.removeItem('lotus_user_name');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-[#2d2d4e]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪷</span>
          <span className="font-bold text-white text-lg">Lotus</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-300 text-sm hidden sm:block">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
        {loading ? (
          <LoadingState stepIndex={stepIndex} topic={topic} />
        ) : (
          <>
            <ExploreForm
              topic={topic}
              setTopic={setTopic}
              mode={mode}
              setMode={setMode}
              imageStyle={imageStyle}
              setImageStyle={setImageStyle}
              onSubmit={handleSubmit}
              error={error}
              userName={userName}
            />
            {sessions.length > 0 && (
              <SessionHistory sessions={sessions} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ExploreForm({
  topic,
  setTopic,
  mode,
  setMode,
  imageStyle,
  setImageStyle,
  onSubmit,
  error,
  userName,
}: {
  topic: string;
  setTopic: (v: string) => void;
  mode: ContentMode;
  setMode: (v: ContentMode) => void;
  imageStyle: ImageStyle;
  setImageStyle: (v: ImageStyle) => void;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
  userName: string;
}) {
  const suggestions = [
    'How black holes work',
    'Machine learning fundamentals',
    'The French Revolution',
    'Quantum computing basics',
    'Climate change science',
    'How vaccines work',
  ];

  return (
    <div className="w-full max-w-2xl text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
        What would you like to
        <br />
        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          learn today
        </span>
        , {userName}?
      </h1>
      <p className="text-slate-400 text-lg mb-10">
        Enter any topic and we'll create a personalized learning experience just for you.
      </p>

      <form onSubmit={onSubmit} className="w-full">
        <div className="flex gap-3 bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-2 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How does photosynthesis work?"
            className="flex-1 bg-transparent text-white placeholder-slate-500 px-4 py-3 text-lg outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            Explore →
          </button>
        </div>
      </form>

      {/* Mode toggle + Image style selector */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-slate-500 text-sm">Video length:</span>
          <div className="flex rounded-lg overflow-hidden border border-[#2d2d4e]">
            <button
              type="button"
              onClick={() => setMode('short')}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                mode === 'short'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0f0f1a] text-slate-400 hover:text-slate-200'
              }`}
            >
              Short (1-2 min)
            </button>
            <button
              type="button"
              onClick={() => setMode('long')}
              className={`px-4 py-1.5 text-sm font-medium transition-all ${
                mode === 'long'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0f0f1a] text-slate-400 hover:text-slate-200'
              }`}
            >
              Long (5-8 min)
            </button>
          </div>
        </div>

        {/* Image style pills */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          <span className="text-slate-500 text-sm shrink-0">Visual style:</span>
          {IMAGE_STYLE_PILLS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setImageStyle(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                imageStyle === opt.value
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                  : 'bg-[#0f0f1a] border-[#2d2d4e] text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-8">
        <p className="text-slate-500 text-sm mb-3">Try one of these topics:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="bg-[#1a1a2e] hover:bg-[#2d2d4e] border border-[#2d2d4e] hover:border-indigo-500/50 text-slate-300 hover:text-white text-sm px-4 py-2 rounded-full transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: Session[] }) {
  const navigate = useNavigate();

  const statusLabel: Record<string, { text: string; color: string }> = {
    complete: { text: 'Content Ready', color: 'text-emerald-400' },
    video_done: { text: 'Video Ready', color: 'text-emerald-400' },
    error: { text: 'Error', color: 'text-red-400' },
    searching: { text: 'Searching…', color: 'text-yellow-400' },
    generating: { text: 'Generating…', color: 'text-yellow-400' },
  };

  return (
    <div className="w-full max-w-2xl mt-12">
      <h3 className="text-slate-400 text-sm font-medium mb-4">Your recent sessions</h3>
      <div className="space-y-2">
        {sessions.map((s) => {
          const st = statusLabel[s.status] ?? { text: s.status, color: 'text-slate-400' };
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/learn/${s.id}`)}
              className="w-full flex items-center justify-between bg-[#1a1a2e] hover:bg-[#2d2d4e] border border-[#2d2d4e] hover:border-indigo-500/30 rounded-xl px-5 py-3.5 transition-all group text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate group-hover:text-indigo-300 transition-colors">
                  {s.topic}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`text-xs font-medium ${st.color} ml-4 shrink-0`}>{st.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState({ stepIndex, topic }: { stepIndex: number; topic: string }) {
  const totalDuration = LOADING_STEPS.reduce((acc, s) => acc + s.duration, 0);
  const elapsed = LOADING_STEPS.slice(0, stepIndex + 1).reduce((acc, s) => acc + s.duration, 0);
  const progress = Math.min((elapsed / totalDuration) * 100, 95);

  return (
    <div className="w-full max-w-md text-center">
      {/* Animated logo */}
      <div className="flex justify-center mb-8">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-violet-500/50 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">🪷</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">
        Creating your lesson on
      </h2>
      <p className="text-indigo-400 font-medium text-lg mb-8 italic">"{topic}"</p>

      {/* Progress bar */}
      <div className="w-full bg-[#2d2d4e] rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {LOADING_STEPS.map((step, i) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i < stepIndex
                ? 'text-slate-500'
                : i === stepIndex
                  ? 'text-slate-200'
                  : 'text-slate-600'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {i < stepIndex ? (
                <span className="text-emerald-500">✓</span>
              ) : i === stepIndex ? (
                <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700" />
              )}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <p className="text-slate-600 text-xs mt-8">This may take 30–60 seconds…</p>
    </div>
  );
}
