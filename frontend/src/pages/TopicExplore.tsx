import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Session, type ContentMode, type ImageStyle, type AssessmentQuestion } from '../api/client';

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
  { label: 'Analyzing your knowledge…', duration: 3000 },
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

  // Assessment state
  const [assessmentPhase, setAssessmentPhase] = useState<'idle' | 'assessing' | 'submitting'>('idle');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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
      // Step 1: Start assessment
      const assessment = await api.startAssessment({ user_id: userId, topic: topic.trim() });
      setThreadId(assessment.thread_id);
      setQuestions(assessment.questions);
      setAnswers({});
      setAssessmentPhase('assessing');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment.');
      setLoading(false);
    }
  }

  async function handleAssessmentSubmit(finalAnswers?: Record<string, string>) {
    if (!threadId) return;
    setAssessmentPhase('submitting');
    setLoading(true);
    try {
      // Step 2: Submit answers (use finalAnswers if provided, fallback to state)
      const result = await api.submitAssessment({ thread_id: threadId, answers: finalAnswers ?? answers });
      // Step 3: Generate content from assessed session
      await api.exploreTopic({
        user_id: userId,
        topic: topic.trim(),
        mode,
        image_style: imageStyle,
        session_id: result.session_id,
      });
      navigate(`/learn/${result.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content.');
      setAssessmentPhase('idle');
      setLoading(false);
    }
  }

  function handleSkipAssessment() {
    // Skip assessment, go directly to content generation
    setAssessmentPhase('idle');
    setLoading(true);
    setError(null);
    (async () => {
      try {
        localStorage.setItem('lotus_image_style', imageStyle);
        const result = await api.exploreTopic({ user_id: userId, topic: topic.trim(), mode, image_style: imageStyle });
        navigate(`/learn/${result.session_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to explore topic.');
        setLoading(false);
      }
    })();
  }

  function handleLogout() {
    localStorage.removeItem('lotus_user_id');
    localStorage.removeItem('lotus_user_name');
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Compact top bar */}
      <header className="flex items-center justify-end px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--gold)', color: '#fff' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {assessmentPhase === 'assessing' ? (
          <AssessmentPanel
            topic={topic}
            questions={questions}
            answers={answers}
            setAnswers={setAnswers}
            onSubmit={(finalAnswers) => handleAssessmentSubmit(finalAnswers)}
            onSkip={handleSkipAssessment}
          />
        ) : loading ? (
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
      <h1 className="text-4xl sm:text-5xl font-bold mb-3 leading-tight"
        style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
        What would you like to
        <br />
        <span style={{ color: 'var(--gold)' }}>
          learn today
        </span>
        , {userName}?
      </h1>
      <p className="text-lg mb-10" style={{ color: 'var(--muted)' }}>
        Enter any topic and we'll create a personalized learning experience just for you.
      </p>

      <form onSubmit={onSubmit} className="w-full">
        <div className="flex gap-3 rounded-2xl p-2 transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(30,58,47,0.06)' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How does photosynthesis work?"
            className="flex-1 bg-transparent px-4 py-3 text-lg outline-none"
            style={{ color: 'var(--text)' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 12px rgba(30,58,47,0.2)' }}
          >
            Explore →
          </button>
        </div>
      </form>

      {/* Mode toggle + Image style selector */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Video length:</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setMode('short')}
              className="px-4 py-1.5 text-sm font-semibold transition-all"
              style={mode === 'short'
                ? { background: 'var(--forest)', color: '#fdf8f0' }
                : { background: 'var(--surface)', color: 'var(--muted)' }}
            >
              Short (1-2 min)
            </button>
            <button
              type="button"
              onClick={() => setMode('long')}
              className="px-4 py-1.5 text-sm font-semibold transition-all"
              style={mode === 'long'
                ? { background: 'var(--forest)', color: '#fdf8f0' }
                : { background: 'var(--surface)', color: 'var(--muted)' }}
            >
              Long (5-8 min)
            </button>
          </div>
        </div>

        {/* Image style pills */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          <span className="text-sm shrink-0" style={{ color: 'var(--muted)' }}>Visual style:</span>
          {IMAGE_STYLE_PILLS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setImageStyle(opt.value)}
              className="px-3 py-1 text-xs font-semibold rounded-full border transition-all"
              style={imageStyle === opt.value
                ? { background: 'rgba(30,58,47,0.1)', border: '1px solid var(--forest)', color: 'var(--forest)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-8">
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>Try one of these topics:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="text-sm px-4 py-2 rounded-full transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                boxShadow: '0 1px 4px rgba(30,58,47,0.06)',
              }}
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

  const statusLabel: Record<string, { text: string; style: React.CSSProperties }> = {
    searching: { text: 'Searching…', style: { color: 'var(--gold)', background: 'rgba(200,150,62,0.1)', border: '1px solid rgba(200,150,62,0.2)' } },
    generating: { text: 'Generating…', style: { color: 'var(--gold)', background: 'rgba(200,150,62,0.1)', border: '1px solid rgba(200,150,62,0.2)' } },
    assessed: { text: 'Assessed', style: { color: 'var(--sky, #0ea5e9)', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' } },
    complete: { text: 'Content Ready', style: { color: 'var(--forest)', background: 'rgba(30,58,47,0.1)', border: '1px solid rgba(30,58,47,0.2)' } },
    images_generating: { text: 'Creating Images…', style: { color: 'var(--gold)', background: 'rgba(200,150,62,0.1)', border: '1px solid rgba(200,150,62,0.2)' } },
    images_done: { text: 'Images Ready', style: { color: 'var(--forest)', background: 'rgba(30,58,47,0.1)', border: '1px solid rgba(30,58,47,0.2)' } },
    audio_generating: { text: 'Creating Audio…', style: { color: 'var(--gold)', background: 'rgba(200,150,62,0.1)', border: '1px solid rgba(200,150,62,0.2)' } },
    audio_done: { text: 'Audio Ready', style: { color: 'var(--forest)', background: 'rgba(30,58,47,0.1)', border: '1px solid rgba(30,58,47,0.2)' } },
    aligned: { text: 'Aligned', style: { color: 'var(--forest)', background: 'rgba(30,58,47,0.1)', border: '1px solid rgba(30,58,47,0.2)' } },
    video_rendering: { text: 'Rendering Video…', style: { color: 'var(--gold)', background: 'rgba(200,150,62,0.1)', border: '1px solid rgba(200,150,62,0.2)' } },
    video_done: { text: 'Video Ready', style: { color: 'var(--forest)', background: 'rgba(30,58,47,0.1)', border: '1px solid rgba(30,58,47,0.2)' } },
    error: { text: 'Error', style: { color: 'var(--rose)', background: 'rgba(196,92,92,0.1)', border: '1px solid rgba(196,92,92,0.2)' } },
  };

  return (
    <div className="w-full max-w-2xl mt-12">
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--muted)' }}>Your recent sessions</h3>
      <div className="space-y-2">
        {sessions.map((s) => {
          const st = statusLabel[s.status] ?? { text: s.status, style: { color: 'var(--muted)' } };
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/learn/${s.id}`)}
              className="w-full flex items-center justify-between rounded-xl px-5 py-3.5 transition-all group text-left hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate transition-colors" style={{ color: 'var(--text)' }}>
                  {s.topic}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="text-xs font-semibold ml-4 shrink-0 px-2.5 py-1 rounded-full"
                style={st.style}>{st.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AssessmentPanel({
  topic,
  questions,
  answers,
  setAnswers,
  onSubmit,
  onSkip,
}: {
  topic: string;
  questions: AssessmentQuestion[];
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  onSubmit: (finalAnswers: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [freeText, setFreeText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQ, answers]);

  const isLastQuestion = currentQ >= questions.length - 1;
  const currentQuestion = questions[currentQ];
  const hasOptions = currentQuestion?.options && currentQuestion.options.length > 0;

  function handleSelectOption(opt: string) {
    const updated = { ...answers, [currentQuestion.id]: opt };
    setAnswers(updated);
    // Auto-advance after a short delay for multiple choice
    setTimeout(() => {
      if (isLastQuestion) {
        onSubmit(updated);
      } else {
        setCurrentQ((prev) => prev + 1);
        setFreeText('');
      }
    }, 400);
  }

  function handleFreeTextSubmit() {
    if (!freeText.trim()) return;
    const updated = { ...answers, [currentQuestion.id]: freeText.trim() };
    setAnswers(updated);
    if (isLastQuestion) {
      onSubmit(updated);
    } else {
      setCurrentQ((prev) => prev + 1);
      setFreeText('');
    }
  }

  // Build chat history: pairs of (question bubble, answer bubble) for answered questions
  const chatHistory: { type: 'question' | 'answer'; text: string }[] = [];
  for (let i = 0; i < currentQ; i++) {
    chatHistory.push({ type: 'question', text: questions[i].question });
    chatHistory.push({ type: 'answer', text: answers[questions[i].id] || '' });
  }

  return (
    <div className="w-full max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
      {/* Header */}
      <div className="text-center mb-4 flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Personalizing your lesson on
        </p>
        <p className="font-semibold italic" style={{ color: 'var(--gold)' }}>"{topic}"</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
        {/* Intro message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
            style={{ background: 'rgba(30,58,47,0.12)' }}>
            💎
          </div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              Let me ask you a few quick questions so I can tailor this lesson to your level.
            </p>
          </div>
        </div>

        {/* Previous Q&A pairs */}
        {chatHistory.map((msg, i) =>
          msg.type === 'question' ? (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                style={{ background: 'rgba(30,58,47,0.12)' }}>
                💎
              </div>
              <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{msg.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]"
                style={{ background: 'var(--forest)', color: '#fdf8f0' }}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          )
        )}

        {/* Current question */}
        {currentQuestion && (
          <>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                style={{ background: 'rgba(30,58,47,0.12)' }}>
                💎
              </div>
              <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{currentQuestion.question}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  Question {currentQ + 1} of {questions.length}
                </p>
              </div>
            </div>

            {/* Answer options */}
            {hasOptions ? (
              <div className="flex flex-wrap gap-2 pl-11">
                {currentQuestion.options!.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all text-left hover:-translate-y-0.5"
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 3px rgba(30,58,47,0.06)',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {currentQuestion && !hasOptions ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFreeTextSubmit()}
              placeholder="Type your answer…"
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleFreeTextSubmit}
              disabled={!freeText.trim()}
              className="px-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: 'var(--forest)', color: '#fdf8f0' }}
            >
              Send
            </button>
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: 'var(--muted)' }}>
            Select an option above to continue
          </p>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-xs font-medium mt-2 py-2 transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          Skip assessment and generate directly →
        </button>
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
          <div className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ border: '2px solid var(--gold)' }} />
          <div className="absolute inset-2 rounded-full animate-pulse opacity-30"
            style={{ border: '2px solid var(--forest)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">💎</span>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
        Creating your lesson on
      </h2>
      <p className="font-medium text-lg mb-8 italic" style={{ color: 'var(--gold)' }}>"{topic}"</p>

      {/* Progress bar */}
      <div className="w-full rounded-full h-1.5 mb-6 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--forest), var(--gold))' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {LOADING_STEPS.map((step, i) => (
          <div
            key={step.label}
            className="flex items-center gap-3 text-sm transition-all duration-500"
            style={{
              color: i < stepIndex ? 'var(--muted)' : i === stepIndex ? 'var(--text)' : 'var(--border)',
            }}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {i < stepIndex ? (
                <span style={{ color: 'var(--forest)' }}>✓</span>
              ) : i === stepIndex ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
              ) : (
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />
              )}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs mt-8" style={{ color: 'var(--muted)' }}>This may take 30–60 seconds…</p>
    </div>
  );
}
