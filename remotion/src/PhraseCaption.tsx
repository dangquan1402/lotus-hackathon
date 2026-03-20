import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Phrase, RenderConfig } from "./types";

interface PhraseCaptionProps {
  phrases: Phrase[];
  renderConfig: RenderConfig;
}

export const PhraseCaption: React.FC<PhraseCaptionProps> = ({
  phrases,
  renderConfig,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeS = frame / fps;
  const fontSize = renderConfig.caption_font_size ?? 42;
  const color = renderConfig.caption_color ?? "#ffffff";

  // Find the active phrase at the current time
  const activePhrase = phrases.find(
    (p) => currentTimeS >= p.start_s && currentTimeS <= p.end_s
  );

  if (!activePhrase) {
    return null;
  }

  const phraseStartFrame = activePhrase.start_s * fps;
  const phraseEndFrame = activePhrase.end_s * fps;
  const fadeDurationFrames = Math.min(6, (phraseEndFrame - phraseStartFrame) / 4);

  // Fade in at start of phrase
  const fadeIn = interpolate(
    frame,
    [phraseStartFrame, phraseStartFrame + fadeDurationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fade out at end of phrase
  const fadeOut = interpolate(
    frame,
    [phraseEndFrame - fadeDurationFrames, phraseEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          marginBottom: 80,
          maxWidth: "85%",
          textAlign: "center",
          opacity,
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 600,
            color,
            fontFamily: "system-ui, -apple-system, sans-serif",
            textShadow:
              "0 2px 4px rgba(0, 0, 0, 0.8), 0 0px 12px rgba(0, 0, 0, 0.6)",
            lineHeight: 1.4,
            padding: "8px 16px",
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            borderRadius: 8,
          }}
        >
          {activePhrase.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
