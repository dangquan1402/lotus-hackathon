import { useState, useEffect } from 'react';
import { api, Session } from '../api/client';

export default function Analytics() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('lotus_user_id');
    if (!userId) return;
    api
      .listSessions(parseInt(userId, 10))
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueTopics = new Set(sessions.map((s) => s.topic));
  const allConcepts = sessions.flatMap((s) => s.concepts_learned ?? []);
  const uniqueConcepts = new Set(allConcepts);
  const completedSessions = sessions.filter(
    (s) => s.status === 'complete' || s.status === 'completed' || s.status === 'slides_ready' || s.status === 'video_ready',
  );

  // Group concepts by topic
  const conceptsByTopic = new Map<string, string[]>();
  for (const s of sessions) {
    if (s.concepts_learned && s.concepts_learned.length > 0) {
      const existing = conceptsByTopic.get(s.topic) ?? [];
      const merged = new Set([...existing, ...s.concepts_learned]);
      conceptsByTopic.set(s.topic, [...merged]);
    }
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--text)' }}>
        <p className="text-lg opacity-60">Loading analytics...</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Sessions', value: sessions.length, accent: 'var(--gold)' },
    { label: 'Topics Explored', value: uniqueTopics.size, accent: '#5b9a7d' },
    { label: 'Concepts Mastered', value: uniqueConcepts.size, accent: '#7ab89a' },
    { label: 'Content Generated', value: completedSessions.length, accent: 'var(--gold)' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10" style={{ color: 'var(--text)' }}>
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}
      >
        Analytics
      </h1>
      <p className="mb-8 opacity-60 text-sm">Your learning progress at a glance</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2 opacity-50">{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.accent }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Concepts Mastered */}
      {conceptsByTopic.size > 0 && (
        <section className="mb-10">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Concepts Mastered
          </h2>
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {[...conceptsByTopic.entries()].map(([topic, concepts]) => (
              <div key={topic}>
                <p className="text-sm font-medium mb-2 opacity-70">{topic}</p>
                <div className="flex flex-wrap gap-2">
                  {concepts.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(200,150,62,0.15)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(200,150,62,0.25)',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Learning Timeline */}
      {sortedSessions.length > 0 && (
        <section>
          <h2
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Learning Timeline
          </h2>
          <div className="relative pl-6">
            {/* Vertical line */}
            <div
              className="absolute left-[9px] top-2 bottom-2 w-[2px]"
              style={{ background: 'rgba(200,150,62,0.3)' }}
            />
            <div className="space-y-4">
              {sortedSessions.map((s) => {
                const date = new Date(s.created_at);
                const statusColors: Record<string, string> = {
                  complete: '#5b9a7d',
                  completed: '#5b9a7d',
                  slides_ready: '#5b9a7d',
                  video_ready: '#5b9a7d',
                  generating: 'var(--gold)',
                  searching: 'var(--gold)',
                  error: '#c0392b',
                };
                const dotColor = statusColors[s.status] ?? 'rgba(200,150,62,0.5)';

                return (
                  <div key={s.id} className="relative flex gap-4">
                    {/* Dot */}
                    <div
                      className="absolute -left-6 top-3 w-[14px] h-[14px] rounded-full border-2"
                      style={{
                        background: dotColor,
                        borderColor: 'var(--card)',
                      }}
                    />
                    <div
                      className="flex-1 rounded-xl p-4"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{s.topic}</p>
                        <span
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: `${dotColor}22`,
                            color: dotColor,
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs opacity-40">
                        {date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 opacity-50">
          <p className="text-lg mb-2">No sessions yet</p>
          <p className="text-sm">Start exploring topics to see your analytics here.</p>
        </div>
      )}
    </div>
  );
}
