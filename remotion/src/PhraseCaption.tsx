import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Phrase, RenderConfig } from "./types";

const CAPTION_RATIO = 0.25; // bottom 25% for captions

interface PhraseCaptionProps {
  phrases: Phrase[];
  renderConfig: RenderConfig;
  layout?: string;
}

export const PhraseCaption: React.FC<PhraseCaptionProps> = ({
  phrases,
  renderConfig,
  layout = "overlay",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeS = frame / fps;
  const fontSize = renderConfig.caption_font_size ?? 42;
  const color = renderConfig.caption_color ?? "#ffffff";

  const activePhrase = phrases.find(
    (p) => currentTimeS >= p.start_s && currentTimeS <= p.end_s
  );

  if (!activePhrase) return null;

  const phraseStartFrame = activePhrase.start_s * fps;
  const phraseEndFrame = activePhrase.end_s * fps;
  const fadeDurationFrames = Math.min(6, (phraseEndFrame - phraseStartFrame) / 4);

  const fadeIn = interpolate(
    frame,
    [phraseStartFrame, phraseStartFrame + fadeDurationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(
    frame,
    [phraseEndFrame - fadeDurationFrames, phraseEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // Caption below image — sits in bottom 25%
  if (layout === "static_caption_below") {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${CAPTION_RATIO * 100}%`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          backgroundColor: "#111118",
        }}
      >
        <div
          style={{
            fontSize: fontSize * 0.85,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontWeight: 600,
            color,
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: "90%",
            opacity,
          }}
        >
          {activePhrase.text}
        </div>
      </div>
    );
  }

  // Default: overlay on image
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
