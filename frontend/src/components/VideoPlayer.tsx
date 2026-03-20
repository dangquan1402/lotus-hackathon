import { useState } from 'react';
import { api } from '../api/client';

interface VideoPlayerProps {
  sessionId: number;
  videoUrl?: string;
  onVideoGenerated: (url: string) => void;
}

type Step = 'idle' | 'images' | 'voice' | 'render' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'images', label: 'Generating images…' },
  { id: 'voice', label: 'Generating narration…' },
  { id: 'render', label: 'Rendering video…' },
];

export default function VideoPlayer({ sessionId, videoUrl, onVideoGenerated }: VideoPlayerProps) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const generating = step !== 'idle' && step !== 'done';

  async function handleGenerate() {
    setError(null);
    try {
      setStep('images');
      await api.generateImages(sessionId);

      setStep('voice');
      await api.generateVoice(sessionId);

      setStep('render');
      const result = await api.generateVideo(sessionId);

      setStep('done');
      onVideoGenerated(
        result.video_url || `/api/files/session_${sessionId}/video/lesson_${sessionId}.mp4`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
      setStep('idle');
    }
  }

  if (!videoUrl && !generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
          <span className="text-4xl">🎬</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No video yet</h3>
        <p className="text-slate-400 mb-8 max-w-sm">
          Generate a personalized video lesson with images, narration, and captions.
        </p>
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm w-full max-w-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          Generate Video
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        <div className="space-y-3 w-full max-w-xs">
          {STEPS.map((s) => {
            const stepIdx = STEPS.findIndex((x) => x.id === step);
            const thisIdx = STEPS.findIndex((x) => x.id === s.id);
            const isDone = thisIdx < stepIdx;
            const isCurrent = s.id === step;

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 text-sm ${
                  isDone ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-slate-600'
                }`}
              >
                <span className="w-5 text-center">
                  {isDone ? '✓' : isCurrent ? (
                    <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : '○'}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-slate-600 text-xs mt-6">This may take a few minutes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl overflow-hidden">
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          className="w-full aspect-video bg-black"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">Your personalized video lesson is ready.</p>
        <button
          onClick={handleGenerate}
          className="text-slate-400 hover:text-indigo-400 text-sm transition-colors"
        >
          ↺ Regenerate
        </button>
      </div>
    </div>
  );
}
