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
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6 border border-violet-500/20">
          <svg className="w-9 h-9 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No slides yet</h3>
        <p className="text-slate-400 mb-8 max-w-sm">
          Generate a downloadable PowerPoint presentation summarizing your lesson's key concepts.
        </p>

        {sections && sections.length > 0 && (
          <div className="w-full max-w-sm mb-8 text-left">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">Will include {sections.length} sections</p>
            <div className="space-y-1.5">
              {sections.map((sec, i) => {
                const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div key={i} className="flex items-center justify-between gap-3 bg-[#0f0f1a] rounded-lg px-3 py-2 border border-[#2d2d4e]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center flex-shrink-0 font-medium">
                        {i + 1}
                      </span>
                      <span className="text-slate-300 text-sm truncate">{sec.title}</span>
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">{wordCount}w</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm w-full max-w-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
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
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Generating your slides…</h3>
        <p className="text-slate-400 text-sm">
          Building a presentation with key concepts and visual summaries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Download card */}
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-white mb-1">Presentation Ready</h3>
            <p className="text-slate-400 text-sm mb-1">
              PowerPoint file (.pptx) with key concepts from your lesson.
            </p>
            {sections && sections.length > 0 && (
              <p className="text-slate-500 text-xs mb-4">
                {sections.length} sections &mdash; {sections.map(s => s.title).join(', ')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PPTX
              </a>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 bg-[#0f0f1a] hover:bg-[#2d2d4e] border border-[#2d2d4e] hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all text-sm"
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Section preview */}
      {sections && sections.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Slide Sections
          </h4>
          <div className="space-y-2">
            {sections.map((sec, i) => {
              const wordCount = sec.narration_text.trim().split(/\s+/).filter(Boolean).length;
              return (
                <div key={i} className="flex items-center justify-between gap-3 bg-[#0f0f1a] rounded-xl px-4 py-3 border border-[#2d2d4e]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-slate-200 text-sm font-medium truncate">{sec.title}</span>
                  </div>
                  <span className="text-slate-500 text-xs flex-shrink-0 tabular-nums">{wordCount} words</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview hint */}
      <div className="bg-[#1a1a2e]/50 border border-[#2d2d4e] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-400 text-sm">
            Open with Microsoft PowerPoint, Google Slides, or LibreOffice Impress.
          </p>
        </div>
      </div>
    </div>
  );
}
