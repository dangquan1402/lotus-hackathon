import { useState } from 'react';
import { api } from '../api/client';

interface SlideViewerProps {
  sessionId: number;
  slidesUrl?: string;
  onSlidesGenerated: (url: string) => void;
}

export default function SlideViewer({ sessionId, slidesUrl, onSlidesGenerated }: SlideViewerProps) {
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
          <span className="text-4xl">📊</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No slides yet</h3>
        <p className="text-slate-400 mb-8 max-w-sm">
          Generate a downloadable PowerPoint presentation summarizing your lesson's key concepts.
        </p>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm w-full max-w-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20"
        >
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
            <span className="text-4xl">📊</span>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-white mb-1">Your Presentation is Ready</h3>
            <p className="text-slate-400 text-sm mb-4">
              A PowerPoint file (.pptx) has been generated with the key concepts from your lesson.
              Download it to use in presentations or for offline study.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20"
              >
                <span>↓</span>
                Download PPTX
              </a>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 bg-[#0f0f1a] hover:bg-[#2d2d4e] border border-[#2d2d4e] hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-2.5 rounded-xl transition-all"
              >
                ↺ Regenerate
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

      {/* Preview hint */}
      <div className="bg-[#1a1a2e]/50 border border-[#2d2d4e] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-indigo-400 mt-0.5 flex-shrink-0">ℹ</span>
          <p className="text-slate-400 text-sm">
            The presentation includes an introduction slide, content slides for each key concept,
            and a summary slide. Open with Microsoft PowerPoint, Google Slides, or LibreOffice Impress.
          </p>
        </div>
      </div>
    </div>
  );
}
