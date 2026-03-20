import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { LessonVideoProps } from "./types";
import { KenBurnsScene, getDirection } from "./KenBurnsScene";
import { TitleCardScene } from "./TitleCardScene";
import { PhraseCaption } from "./PhraseCaption";

const DEFAULT_FPS = 30;

export const LessonVideo: React.FC<LessonVideoProps> = ({
  scenes,
  phrases,
  transitionDurationFrames,
  renderConfig,
}) => {
  const fps = renderConfig.fps ?? DEFAULT_FPS;

  // Count total title card sections for progress dots
  const totalSections = scenes.filter(
    (s) => s.scene_type === "title_card"
  ).length;

  return (
    <AbsoluteFill style={{ backgroundColor: renderConfig.bg_color ?? "#000000" }}>
      {/* Narration audio */}
      <Audio src={staticFile("narration.wav")} />

      {/* Scene sequence with transitions */}
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const durationFrames = Math.round(scene.duration_s * fps);

          return (
            <React.Fragment key={scene.index}>
              {i > 0 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({
                    durationInFrames: transitionDurationFrames,
                  })}
                />
              )}
              <TransitionSeries.Sequence durationInFrames={durationFrames}>
                {scene.scene_type === "title_card" ? (
                  <TitleCardScene
                    sectionNumber={scene.title_card_number ?? 1}
                    titleText={scene.title_card_text ?? scene.caption}
                    totalSections={totalSections}
                    bgColor={renderConfig.title_card_bg_color}
                    textColor={renderConfig.title_card_text_color}
                  />
                ) : (
                  <KenBurnsScene
                    imageSrc={staticFile(
                      `scene_${String(scene.index).padStart(2, "0")}.jpg`
                    )}
                    direction={getDirection(scene.index)}
                  />
                )}
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Caption overlay */}
      {phrases.length > 0 && (
        <PhraseCaption phrases={phrases} renderConfig={renderConfig} />
      )}
    </AbsoluteFill>
  );
};
