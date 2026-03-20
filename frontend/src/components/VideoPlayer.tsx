import { useState } from 'react';
import { api } from '../api/client';

interface VideoPlayerProps {
  sessionId: number;
  videoUrl?: string;
  onVideoGenerated: (url: string) => void;
}

export default function VideoPlayer({ sessionId, videoUrl, onVideoGenerated }: VideoPlayerProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedUrl = videoUrl ?? (api.getVideoUrl(sessionId));

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateVideo(sessionId);
      if (result.video_url) {
        onVideoGenerated(result.video_url);
      } else {
        // Video URL will be served by the backend at the standard path
        onVideoGenerated(api.getVideoUrl(sessionId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video. Please try again.');
    } finally {
      setGenerating(false);
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
          Generate a personalized video lesson tailored to your learning style and expertise level.
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
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Generating your video…</h3>
        <p className="text-slate-400 text-sm">
          This may take a few minutes. We're creating a personalized video lesson for you.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl overflow-hidden">
        <video
          key={resolvedUrl}
          src={resolvedUrl}
          controls
          className="w-full aspect-video bg-black"
          preload="metadata"
          onError={() => setError('Failed to load video. The video may still be processing.')}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          Use the video controls to play, pause, and seek through your lesson.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="text-slate-400 hover:text-indigo-400 text-sm transition-colors flex items-center gap-1"
        >
          ↺ Regenerate
        </button>
      </div>
    </div>
  );
}
