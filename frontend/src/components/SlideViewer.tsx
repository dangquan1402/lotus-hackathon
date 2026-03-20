import { useState } from 'react';
import { api } from '../api/client';

interface Section {
  title: string;
  narration_text: string;
}

interface SlideViewerProps {
  sessionId: number;
  slidesUrl?: string;
  sections?: Section[];
  onSlidesGenerated: (url: string) => void;
}

export default function SlideViewer({ sessionId, slidesUrl, sections, onSlidesGenerated }: SlideViewerProps) {
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
    <div className="space-y-6">
      {/* Download card */}
      <div className="rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.15)' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--forest-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold mb-1"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
              Presentation Ready
            </h3>
            <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
              PowerPoint file (.pptx) with key concepts from your lesson.
            </p>
            {sections && sections.length > 0 && (
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                {sections.length} sections &mdash; {sections.map(s => s.title).join(', ')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all text-sm hover:-translate-y-0.5"
                style={{ background: 'var(--forest)', color: '#fdf8f0', boxShadow: '0 4px 12px rgba(30,58,47,0.2)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PPTX
              </a>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-xl transition-all text-sm"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {/* Section preview */}
      {sections && sections.length > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h4 className="font-bold mb-4 flex items-center gap-2"
            style={{ color: 'var(--forest)' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--forest-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Slide Sections
          </h4>
          <div className="space-y-2">
            {sections.map((sec, i) => {
              const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold"
                      style={{ background: 'rgba(30,58,47,0.12)', color: 'var(--forest)' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{sec.title}</span>
                  </div>
                  <span className="text-xs flex-shrink-0 tabular-nums"
                    style={{ color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>{wordCount} words</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview hint */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--sky)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Open with Microsoft PowerPoint, Google Slides, or LibreOffice Impress.
          </p>
        </div>
      </div>
    </div>
  );
}
