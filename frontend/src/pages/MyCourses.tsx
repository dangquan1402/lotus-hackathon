import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Session } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

type FilterTab = 'all' | 'in_progress' | 'completed';

const STATUS_LABELS: Record<string, { text: string; style: React.CSSProperties }> = {
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

const COMPLETED_STATUSES = new Set(['video_done', 'images_done', 'audio_done', 'aligned']);
const IN_PROGRESS_STATUSES = new Set(['searching', 'generating', 'assessed', 'complete', 'images_generating', 'audio_generating', 'video_rendering']);

function isCompleted(status: string) {
  return COMPLETED_STATUSES.has(status);
}

function isInProgress(status: string) {
  return IN_PROGRESS_STATUSES.has(status);
}

export default function MyCourses() {
  const navigate = useNavigate();
  const userId = parseInt(localStorage.getItem('lotus_user_id') ?? '0', 10);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (!userId) return;
    api.listSessions(userId)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = sessions.filter((s) => {
    if (filter === 'completed') return isCompleted(s.status);
    if (filter === 'in_progress') return isInProgress(s.status);
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}
        >
          My Courses
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          {sessions.length} {sessions.length === 1 ? 'course' : 'courses'} total
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={
                filter === tab.key
                  ? { background: 'var(--forest)', color: '#fdf8f0' }
                  : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--muted)' }}>
              {filter === 'all' ? 'No courses yet' : `No ${filter === 'in_progress' ? 'in-progress' : 'completed'} courses`}
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--forest)', color: '#fdf8f0' }}
            >
              Explore a topic
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((session) => (
              <SessionCard key={session.id} session={session} onClick={() => navigate(`/learn/${session.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onClick }: { session: Session; onClick: () => void }) {
  const st = STATUS_LABELS[session.status] ?? { text: session.status, style: { color: 'var(--muted)' } };
  const conceptsCount = session.concepts_learned?.length ?? 0;
  const firstImage = session.image_paths?.[0];
  const thumbnailUrl = firstImage
    ? `${API_BASE}/api/files/${firstImage.replace('output/', '')}`
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg group"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Thumbnail */}
      <div
        className="w-full h-40 flex items-center justify-center"
        style={{ background: thumbnailUrl ? undefined : 'linear-gradient(135deg, var(--forest), rgba(30,58,47,0.7))' }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={session.topic}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl opacity-60">📚</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="font-semibold text-base leading-snug line-clamp-2"
            style={{ color: 'var(--text)' }}
          >
            {session.topic}
          </h3>
        </div>

        <span
          className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
          style={st.style}
        >
          {st.text}
        </span>

        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            {new Date(session.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {conceptsCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {conceptsCount} concept{conceptsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
