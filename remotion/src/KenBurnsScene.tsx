import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type KenBurnsDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "pan-up" | "pan-down";

interface KenBurnsSceneProps {
  imageSrc: string;
  direction?: KenBurnsDirection;
}

const SCALE_RANGE = 0.08;
const PAN_RANGE = 5;

export const KenBurnsScene: React.FC<KenBurnsSceneProps> = ({ imageSrc, direction = "zoom-in" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  switch (direction) {
    case "zoom-in": scale = interpolate(progress, [0, 1], [1, 1 + SCALE_RANGE]); break;
    case "zoom-out": scale = interpolate(progress, [0, 1], [1 + SCALE_RANGE, 1]); break;
    case "pan-left": scale = 1 + SCALE_RANGE / 2; translateX = interpolate(progress, [0, 1], [PAN_RANGE, -PAN_RANGE]); break;
    case "pan-right": scale = 1 + SCALE_RANGE / 2; translateX = interpolate(progress, [0, 1], [-PAN_RANGE, PAN_RANGE]); break;
    case "pan-up": scale = 1 + SCALE_RANGE / 2; translateY = interpolate(progress, [0, 1], [PAN_RANGE, -PAN_RANGE]); break;
    case "pan-down": scale = 1 + SCALE_RANGE / 2; translateY = interpolate(progress, [0, 1], [-PAN_RANGE, PAN_RANGE]); break;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)` }} />
    </AbsoluteFill>
  );
};

const DIRECTIONS: KenBurnsDirection[] = ["zoom-in", "pan-right", "zoom-out", "pan-left", "zoom-in", "pan-up", "zoom-out", "pan-down"];
export function getDirection(index: number): KenBurnsDirection {
  return DIRECTIONS[index % DIRECTIONS.length];
}
