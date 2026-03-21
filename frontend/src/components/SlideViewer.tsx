import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

interface Section {
  title: string;
  narration_text: string;
}

interface SlideViewerProps {
  sessionId: number;
  slidesUrl?: string;
  sections?: Section[];
  imagePaths?: string[];
  onSlidesGenerated: (url: string) => void;
}

export default function SlideViewer({ sessionId, slidesUrl, sections, imagePaths, onSlidesGenerated }: SlideViewerProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadUrl = slidesUrl ?? api.getSlidesUrl(sessionId);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateSlides(sessionId);
      if (result.slides_url) {
        onSlidesGenerated(result.slides_url);
      } else {
        onSlidesGenerated(api.getSlidesUrl(sessionId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate slides. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  if (!slidesUrl && !generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.15)' }}>
          <svg className="w-9 h-9" style={{ color: 'var(--forest-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
          No slides yet
        </h3>
        <p className="mb-8 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
          Generate a downloadable PowerPoint presentation summarizing your lesson's key concepts.
        </p>

        {sections && sections.length > 0 && (
          <div className="w-full max-w-sm mb-8 text-left">
            <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--muted)' }}>
              Will include {sections.length} sections
            </p>
            <div className="space-y-1.5">
              {sections.map((sec, i) => {
                const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 font-semibold"
                        style={{ background: 'rgba(30,58,47,0.12)', color: 'var(--forest)' }}>
                        {i + 1}
                      </span>
                      <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{sec.title}</span>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>{wordCount}w</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm w-full max-w-sm"
            style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2 hover:-translate-y-0.5"
          style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 16px rgba(30,58,47,0.25)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
          </svg>
          Generate Slides
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20"
            style={{ border: '2px solid var(--forest)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--forest)', borderTopColor: 'transparent' }} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
          Generating your slides…
        </h3>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Building a presentation with key concepts and visual summaries.
        </p>
      </div>
    );
  }

  return (
    <SlidePresenter
      sections={sections ?? []}
      imagePaths={imagePaths}
      sessionId={sessionId}
      downloadUrl={downloadUrl}
      onRegenerate={handleGenerate}
      regenerating={generating}
      error={error}
    />
  );
}

// ─── In-browser Slide Presenter ───────────────────────────────────────────────

function SlidePresenter({
  sections,
  imagePaths,
  sessionId,
  downloadUrl,
  onRegenerate,
  regenerating,
  error,
}: {
  sections: Section[];
  imagePaths?: string[];
  sessionId: number;
  downloadUrl: string;
  onRegenerate: () => void;
  regenerating: boolean;
  error: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const total = sections.length;

  const goNext = useCallback(() => { setCurrent((c) => Math.min(c + 1, total - 1)); setActiveImage(0); }, [total]);
  const goPrev = useCallback(() => { setCurrent((c) => Math.max(c - 1, 0)); setActiveImage(0); }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (total === 0) return null;

  const slide = sections[current];

  // Get images for current section: pattern is scene_XX_YY.jpg
  const sectionImages = (imagePaths ?? [])
    .filter((p) => {
      const prefix = `scene_${String(current).padStart(2, '0')}_`;
      return p.includes(prefix);
    })
    .map((p) => `/api/files/${p.replace(/^output\//, '')}`);

  const currentImage = sectionImages[activeImage] || sectionImages[0];
  const hasImages = sectionImages.length > 0;

  return (
    <div className="space-y-4">
      {/* Slide card — image on top, text below */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--forest) 0%, #2d4a3e 100%)' }}>

        {/* Top: 16:9 Image */}
        {hasImages && (
          <div className="relative" style={{ aspectRatio: '16 / 9' }}>
            <img
              src={currentImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Slide number badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold z-10"
              style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(253,248,240,0.9)', backdropFilter: 'blur(8px)' }}>
              {current + 1} / {total}
            </div>
            {/* Image selector dots */}
            {sectionImages.length > 1 && (
              <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                {sectionImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      background: i === activeImage ? '#fdf8f0' : 'rgba(253,248,240,0.35)',
                      transform: i === activeImage ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    }}
                  />
                ))}
              </div>
            )}
            {/* Nav arrows on image */}
            {current > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: '#fdf8f0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {current < total - 1 && (
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: '#fdf8f0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Bottom: Text content */}
        <div className="px-8 py-6">
          {!hasImages && (
            <div className="mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(253,248,240,0.7)' }}>
                {current + 1} / {total}
              </span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: '#fdf8f0' }}>
            {slide.title}
          </h2>
          <p className="text-sm leading-relaxed"
            style={{ color: 'rgba(253,248,240,0.85)' }}>
            {slide.narration_text}
          </p>
        </div>

        {/* Nav arrows (only when no images) */}
        {!hasImages && (
          <div className="relative pb-6">
            {current > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fdf8f0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {current < total - 1 && (
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fdf8f0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image thumbnails strip */}
      {sectionImages.length > 1 && (
        <div className="flex gap-2 justify-center">
          {sectionImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className="w-20 h-12 rounded-lg overflow-hidden transition-all flex-shrink-0 hover:-translate-y-0.5"
              style={{
                border: i === activeImage ? '2px solid var(--forest)' : '2px solid var(--border)',
                opacity: i === activeImage ? 1 : 0.6,
              }}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Slide dots + actions */}
      <div className="flex items-center justify-between">
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setActiveImage(0); }}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === current ? 'var(--forest)' : 'var(--border)',
                transform: i === current ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--forest)', background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.15)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PPTX
          </a>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
        Use arrow keys or click to navigate slides
      </p>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
