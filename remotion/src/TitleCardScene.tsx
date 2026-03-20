import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface TitleCardSceneProps {
  sectionNumber: number;
  titleText: string;
  totalSections: number;
  bgColor?: string;
  textColor?: string;
}

export const TitleCardScene: React.FC<TitleCardSceneProps> = ({
  sectionNumber,
  titleText,
  totalSections,
  bgColor = "#1e3a5f",
  textColor = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Spring animation for the section number badge
  const numberScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: 30,
  });

  // Spring animation for the title text (slightly delayed)
  const titleTranslateY = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 35,
  });

  // Spring animation for the progress dots (more delayed)
  const dotsOpacity = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 16, stiffness: 60 },
    durationInFrames: 30,
  });

  // Fade out near the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      {/* Section number badge */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          transform: `scale(${numberScale})`,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: textColor,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {sectionNumber}
        </span>
      </div>

      {/* Title text */}
      <div
        style={{
          transform: `translateY(${interpolate(titleTranslateY, [0, 1], [30, 0])}px)`,
          opacity: titleTranslateY,
          maxWidth: "80%",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: textColor,
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: 1.3,
            margin: 0,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          {titleText}
        </h1>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 48,
          opacity: dotsOpacity,
        }}
      >
        {Array.from({ length: totalSections }, (_, i) => (
          <div
            key={i}
            style={{
              width: i + 1 === sectionNumber ? 32 : 12,
              height: 12,
              borderRadius: 6,
              backgroundColor:
                i + 1 === sectionNumber
                  ? textColor
                  : "rgba(255, 255, 255, 0.3)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
