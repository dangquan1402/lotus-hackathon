import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User, Session } from '../api/client';

const GOAL_LABELS: Record<string, string> = {
  curiosity: 'Curiosity-driven learning',
  exam_prep: 'Exam preparation',
  homework: 'Homework help',
  career: 'Career development',
};

const STYLE_LABELS: Record<string, string> = {
  visual: 'Visual',
  auditory: 'Auditory',
  reading: 'Reading/Writing',
  kinesthetic: 'Hands-on',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function generateSuggestions(user: User, sessions: Session[]): string[] {
  const learnedConcepts = new Set(
    sessions.flatMap((s) => s.concepts_learned ?? [])
  );
  const completedTopics = new Set(sessions.map((s) => s.topic.toLowerCase()));
  const suggestions: string[] = [];

  // Deeper dives based on concepts learned
  const deeperDiveTemplates: [string, string][] = [
    ['Gravitational waves', 'LIGO and gravitational wave detection'],
    ['Photosynthesis', 'C4 and CAM photosynthesis pathways'],
    ['DNA', 'CRISPR gene editing techniques'],
    ['Quantum', 'Quantum computing applications'],
    ['Neural network', 'Transformer architectures and attention mechanisms'],
    ['Evolution', 'Convergent evolution and adaptive radiation'],
    ['Electricity', 'Semiconductor physics and transistors'],
    ['Climate', 'Climate modeling and feedback loops'],
  ];

  for (const [concept, deeper] of deeperDiveTemplates) {
    if (suggestions.length >= 5) break;
    const hasRelated = [...learnedConcepts].some((c) =>
      c.toLowerCase().includes(concept.toLowerCase())
    );
    if (hasRelated && !completedTopics.has(deeper.toLowerCase())) {
      suggestions.push(deeper);
    }
  }

  // Interest-based suggestions
  for (const interest of user.interests) {
    if (suggestions.length >= 5) break;
    const interestLower = interest.toLowerCase();
    if (!completedTopics.has(interestLower)) {
      suggestions.push(`Advanced ${interest}`);
    }
    if (suggestions.length < 5 && !completedTopics.has(`history of ${interestLower}`)) {
      suggestions.push(`History of ${interest}`);
    }
  }

  // Fallback cross-topic suggestions
  if (suggestions.length < 3) {
    const fallbacks = [
      'The science of learning and memory',
      'Critical thinking and scientific method',
      'How technology shapes society',
    ];
    for (const f of fallbacks) {
      if (suggestions.length >= 5) break;
      if (!completedTopics.has(f.toLowerCase())) suggestions.push(f);
    }
  }

  return suggestions.slice(0, 5);
}

export default function StudyPlan() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('lotus_user_id');
    if (!userId) return;
    const id = parseInt(userId, 10);
    if (isNaN(id)) return;

    Promise.all([api.getUser(id), api.listSessions(id)])
      .then(([u, s]) => {
        setUser(u);
        setSessions(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completedSessions = sessions.filter(
    (s) => s.status === 'completed' || s.generated_content
  );
  const suggestions = user ? generateSuggestions(user, sessions) : [];

  const handleExplore = (topic: string) => {
    localStorage.setItem('lotus_prefill_topic', topic);
    navigate('/explore');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}
        >
          Study Plan
        </h1>
        <p style={{ color: 'rgba(253,248,240,0.6)' }}>
          Track your progress and discover what to learn next
        </p>
      </div>

      <div className="grid gap-6">
        {/* Learning Goals */}
        {user && (
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.15)' }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}
            >
              Learning Goals
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(200,150,62,0.06)', border: '1px solid rgba(200,150,62,0.1)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(253,248,240,0.4)' }}>
                  Goal
                </p>
                <p className="font-medium" style={{ color: 'var(--cream)' }}>
                  {user.goal ? GOAL_LABELS[user.goal] || user.goal : 'Not set'}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(200,150,62,0.06)', border: '1px solid rgba(200,150,62,0.1)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(253,248,240,0.4)' }}>
                  Expertise Level
                </p>
                <p className="font-medium" style={{ color: 'var(--cream)' }}>
                  {LEVEL_LABELS[user.expertise_level] || user.expertise_level}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(200,150,62,0.06)', border: '1px solid rgba(200,150,62,0.1)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(253,248,240,0.4)' }}>
                  Learning Style
                </p>
                <p className="font-medium" style={{ color: 'var(--cream)' }}>
                  {STYLE_LABELS[user.learning_style] || user.learning_style}
                </p>
              </div>
            </div>
            {user.interests.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(253,248,240,0.4)' }}>
                  Interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest) => (
                    <span
                      key={interest}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ background: 'rgba(200,150,62,0.15)', color: 'var(--gold)' }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Completed Lessons */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.15)' }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}
          >
            Completed Lessons
          </h2>
          {completedSessions.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(253,248,240,0.5)' }}>
              No completed lessons yet. Start exploring topics!
            </p>
          ) : (
            <div className="space-y-2">
              {completedSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/learn/${session.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(200,150,62,0.06)', border: '1px solid rgba(200,150,62,0.1)' }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(200,150,62,0.2)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="var(--gold)" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--cream)' }}>
                      {session.generated_content?.title || session.topic}
                    </p>
                    {session.concepts_learned && session.concepts_learned.length > 0 && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(253,248,240,0.4)' }}>
                        Learned: {session.concepts_learned.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'rgba(253,248,240,0.35)' }}>
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Suggested Next Topics */}
        {suggestions.length > 0 && (
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.15)' }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}
            >
              Suggested Next Topics
            </h2>
            <div className="space-y-2">
              {suggestions.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(200,150,62,0.06)', border: '1px solid rgba(200,150,62,0.1)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(200,150,62,0.15)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="var(--gold)" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                    <span className="font-medium truncate" style={{ color: 'var(--cream)' }}>
                      {topic}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExplore(topic)}
                    className="flex-shrink-0 ml-3 text-sm font-medium px-4 py-1.5 rounded-lg transition-all hover:scale-105"
                    style={{ background: 'rgba(200,150,62,0.2)', color: 'var(--gold)' }}
                  >
                    Explore →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
