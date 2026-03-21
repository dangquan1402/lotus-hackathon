import { useState, useEffect } from 'react';
import { api, type Session } from '../api/client';
import KnowledgeGraph from '../components/KnowledgeGraph';

export default function KnowledgeGraphPage() {
  const userId = parseInt(localStorage.getItem('lotus_user_id') || '0', 10);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (userId) {
      api.listSessions(userId).then(setSessions).catch(() => {}).finally(() => setLoading(false));
    }
  }, [userId]);

  const sessionsWithConcepts = sessions.filter(
    (s) => s.concepts_learned && s.concepts_learned.length > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (sessionsWithConcepts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--forest)' }}>
          Knowledge Graph
        </h1>
        <p style={{ color: 'var(--muted)' }}>
          Complete some learning sessions to see your knowledge graph.
        </p>
      </div>
    );
  }

  return (
    <div className={expanded ? 'fixed inset-0 z-50' : 'px-6 py-8'} style={expanded ? { background: 'var(--bg)' } : {}}>
      {/* Header */}
      <div className={`flex items-center justify-between ${expanded ? 'px-6 pt-6 pb-2' : 'mb-6'}`}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--forest)' }}>
            Knowledge Graph
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {sessionsWithConcepts.length} topics · {sessionsWithConcepts.reduce((n, s) => n + (s.concepts_learned?.length || 0), 0)} concepts
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all hover:opacity-80"
          style={{
            background: expanded ? 'var(--forest)' : 'var(--surface)',
            color: expanded ? '#fdf8f0' : 'var(--forest)',
            border: '1px solid var(--border)',
          }}
        >
          {expanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
          {expanded ? 'Exit Fullscreen' : 'Expand'}
        </button>
      </div>

      {/* Graph */}
      <div
        className={expanded ? 'px-6' : ''}
        style={{
          height: expanded ? 'calc(100vh - 80px)' : '600px',
          borderRadius: expanded ? 0 : '16px',
          overflow: 'hidden',
          border: expanded ? 'none' : '1px solid var(--border)',
          boxShadow: expanded ? 'none' : '0 2px 12px rgba(30,58,47,0.06)',
        }}
      >
        <KnowledgeGraph sessions={sessionsWithConcepts} />
      </div>
    </div>
  );
}
