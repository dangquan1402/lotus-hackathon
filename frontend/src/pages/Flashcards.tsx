import { useState, useEffect, useMemo } from 'react';
import { api, type Session } from '../api/client';

interface FlashcardProgress {
  [concept: string]: 'known' | 'learning';
}

function getProgress(): FlashcardProgress {
  try {
    return JSON.parse(localStorage.getItem('lotus_flashcard_progress') || '{}');
  } catch {
    return {};
  }
}

function saveProgress(progress: FlashcardProgress) {
  localStorage.setItem('lotus_flashcard_progress', JSON.stringify(progress));
}

interface ConceptCard {
  concept: string;
  topic: string;
  sessionId: number;
}

export default function Flashcards() {
  const userId = parseInt(localStorage.getItem('lotus_user_id') ?? '0', 10);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<FlashcardProgress>(getProgress);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  useEffect(() => {
    if (!userId) return;
    api
      .listSessions(userId)
      .then((s) => setSessions(s.filter((sess) => sess.concepts_learned && sess.concepts_learned.length > 0)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const allCards: ConceptCard[] = useMemo(() => {
    const cards: ConceptCard[] = [];
    for (const sess of sessions) {
      for (const concept of sess.concepts_learned ?? []) {
        cards.push({ concept, topic: sess.topic, sessionId: sess.id });
      }
    }
    return cards;
  }, [sessions]);

  const filteredCards = useMemo(
    () => (selectedTopic === 'all' ? allCards : allCards.filter((c) => c.topic === selectedTopic)),
    [allCards, selectedTopic],
  );

  const topics = useMemo(() => {
    const set = new Set(allCards.map((c) => c.topic));
    return Array.from(set);
  }, [allCards]);

  const knownCount = filteredCards.filter((c) => progress[c.concept] === 'known').length;

  const card = filteredCards[currentIndex];

  function markCard(status: 'known' | 'learning') {
    if (!card) return;
    const next = { ...progress, [card.concept]: status };
    setProgress(next);
    saveProgress(next);
    if (currentIndex < filteredCards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex((i) => i + 1), 200);
    }
  }

  function navigate(dir: -1 | 1) {
    const next = currentIndex + dir;
    if (next < 0 || next >= filteredCards.length) return;
    setFlipped(false);
    setTimeout(() => setCurrentIndex(next), 150);
  }

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setFlipped(false);
  }, [selectedTopic]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--text)' }}>
        <div className="animate-pulse text-lg" style={{ color: 'var(--gold)' }}>
          Loading flashcards...
        </div>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6" style={{ color: 'var(--text)' }}>
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: 'rgba(200,150,62,0.15)' }}
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
            <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M3 10h18" />
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--gold)' }}>
          No flashcards yet
        </h2>
        <p className="text-center opacity-60 max-w-sm">
          Explore some topics first! Flashcards will be generated from the concepts you learn.
        </p>
      </div>
    );
  }

  const progressPct = filteredCards.length > 0 ? Math.round((knownCount / filteredCards.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen px-6 py-8 max-w-2xl mx-auto" style={{ color: 'var(--text)' }}>
      {/* Header */}
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}>
        Flashcards
      </h1>
      <p className="text-sm opacity-60 mb-6">Review and master your learned concepts</p>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: 'var(--gold)' }}>
            {knownCount} of {filteredCards.length} mastered
          </span>
          <span className="opacity-50">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,150,62,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'var(--gold)' }}
          />
        </div>
      </div>

      {/* Topic filter */}
      {topics.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setSelectedTopic('all')}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={
              selectedTopic === 'all'
                ? { background: 'var(--gold)', color: '#1e3a2f' }
                : { background: 'rgba(200,150,62,0.12)', color: 'var(--gold)' }
            }
          >
            All ({allCards.length})
          </button>
          {topics.map((t) => {
            const count = allCards.filter((c) => c.topic === t).length;
            return (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all truncate max-w-[160px]"
                style={
                  selectedTopic === t
                    ? { background: 'var(--gold)', color: '#1e3a2f' }
                    : { background: 'rgba(200,150,62,0.12)', color: 'var(--gold)' }
                }
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Card counter */}
      <div className="text-center text-xs opacity-50 mb-3">
        {currentIndex + 1} / {filteredCards.length}
      </div>

      {/* Flashcard */}
      {card && (
        <div className="perspective-[800px] mb-6">
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full cursor-pointer"
            style={{
              height: '280px',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s ease',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, rgba(200,150,62,0.12) 0%, rgba(200,150,62,0.06) 100%)',
                border: '1px solid rgba(200,150,62,0.2)',
              }}
            >
              <span className="text-xs uppercase tracking-widest mb-4 opacity-40">Concept</span>
              <h2
                className="text-xl font-bold text-center leading-relaxed"
                style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}
              >
                {card.concept}
              </h2>
              <span className="mt-6 text-xs opacity-30">Tap to flip</span>
              {progress[card.concept] && (
                <span
                  className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={
                    progress[card.concept] === 'known'
                      ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                      : { background: 'rgba(200,150,62,0.15)', color: 'var(--gold)' }
                  }
                >
                  {progress[card.concept] === 'known' ? 'Mastered' : 'Learning'}
                </span>
              )}
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(200,150,62,0.08) 100%)',
                border: '1px solid rgba(74,222,128,0.2)',
              }}
            >
              <span className="text-xs uppercase tracking-widest mb-4 opacity-40">Learned in</span>
              <h2
                className="text-lg font-semibold text-center leading-relaxed"
                style={{ color: '#4ade80', fontFamily: "'Playfair Display', serif" }}
              >
                {card.topic}
              </h2>
              <span className="mt-6 text-xs opacity-30">Tap to flip back</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation + Actions */}
      {card && (
        <div className="flex flex-col gap-4">
          {/* Know it / Still learning */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => markCard('learning')}
              className="flex-1 max-w-[180px] py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(200,150,62,0.12)',
                color: 'var(--gold)',
                border: '1px solid rgba(200,150,62,0.25)',
              }}
            >
              Still learning
            </button>
            <button
              onClick={() => markCard('known')}
              className="flex-1 max-w-[180px] py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(74,222,128,0.12)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              Know it
            </button>
          </div>

          {/* Prev / Next */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
              style={{ color: 'var(--text)', background: 'rgba(253,248,240,0.06)' }}
            >
              Previous
            </button>
            <button
              onClick={() => navigate(1)}
              disabled={currentIndex >= filteredCards.length - 1}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
              style={{ color: 'var(--text)', background: 'rgba(253,248,240,0.06)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
