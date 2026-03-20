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
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.15)' }}>
          <span className="text-4xl">🎬</span>
        </div>
        <h3 className="text-xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--forest)' }}>
          No video yet
        </h3>
        <p className="mb-8 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
          Generate a personalized video lesson with images, narration, and captions.
        </p>
        {error && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm w-full max-w-sm"
            style={{ background: 'rgba(196,92,92,0.08)', border: '1px solid rgba(196,92,92,0.3)', color: 'var(--rose)' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          className="font-semibold px-8 py-3 rounded-xl transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--gold)', color: '#fff', boxShadow: '0 4px 16px rgba(200,150,62,0.3)' }}
        >
          Generate Video
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20"
            style={{ border: '2px solid var(--forest)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
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
                className="flex items-center gap-3 text-sm"
                style={{
                  color: isDone ? 'var(--forest)' : isCurrent ? 'var(--text)' : 'var(--border)',
                }}
              >
                <span className="w-5 text-center">
                  {isDone ? (
                    <span style={{ color: 'var(--forest)' }}>✓</span>
                  ) : isCurrent ? (
                    <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
                  ) : '○'}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-6" style={{ color: 'var(--muted)' }}>This may take a few minutes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
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
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Your personalized video lesson is ready.</p>
        <button
          onClick={handleGenerate}
          className="text-sm transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          ↺ Regenerate
        </button>
      </div>
    </div>
  );
}
