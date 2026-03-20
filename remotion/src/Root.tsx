import React from "react";
import { Composition, staticFile } from "remotion";
import { LessonVideo } from "./LessonVideo";
import type { LessonData, LessonVideoProps, RenderConfig, Scene, Phrase } from "./types";

const DEFAULT_RENDER_CONFIG: RenderConfig = {
  fps: 30,
  width: 1920,
  height: 1080,
  transition_frames: 15,
  caption_font_size: 42,
  caption_color: "#ffffff",
  bg_color: "#000000",
  title_card_bg_color: "#1e3a5f",
  title_card_text_color: "#ffffff",
};

const FALLBACK_SCENES: Scene[] = [
  {
    index: 0,
    duration_s: 3,
    caption: "Welcome to the lesson",
    image_prompt: "",
    audio_start_s: 0,
    audio_end_s: 3,
    scene_type: "title_card",
    title_card_number: 1,
    title_card_text: "Welcome",
  },
  {
    index: 1,
    duration_s: 5,
    caption: "Introduction scene",
    image_prompt: "A scenic landscape",
    audio_start_s: 3,
    audio_end_s: 8,
    scene_type: "illustration",
  },
];

function computeDurationFrames(scenes: Scene[], fps: number, transitionFrames: number): number {
  const totalSceneDuration = scenes.reduce(
    (sum, s) => sum + Math.round(s.duration_s * fps),
    0
  );
  const totalTransitionOverlap =
    Math.max(0, scenes.length - 1) * transitionFrames;
  return totalSceneDuration - totalTransitionOverlap;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UntypedComposition = Composition as React.FC<any>;

export const RemotionRoot: React.FC = () => {
  return (
    <UntypedComposition
      id="LessonVideo"
      component={LessonVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        scenes: FALLBACK_SCENES,
        phrases: [],
        transitionDurationFrames: DEFAULT_RENDER_CONFIG.transition_frames!,
        renderConfig: DEFAULT_RENDER_CONFIG,
      }}
      calculateMetadata={async ({ props }: { props: LessonVideoProps }) => {
        let scenes: Scene[] = props.scenes;
        let phrases: Phrase[] = props.phrases;
        let renderConfig: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...props.renderConfig };

        if (scenes === FALLBACK_SCENES || scenes.length === 0) {
          try {
            const resp = await fetch(staticFile("story-scenes.json"));
            if (resp.ok) {
              const data: LessonData = await resp.json();
              scenes = data.scenes;
              phrases = data.phrases ?? [];
              renderConfig = { ...DEFAULT_RENDER_CONFIG, ...data.render_config };
            }
          } catch {
            // Use fallback scenes
          }
        }

        const fps = renderConfig.fps ?? 30;
        const transitionFrames = renderConfig.transition_frames ?? 15;
        const durationInFrames = computeDurationFrames(scenes, fps, transitionFrames);

        return {
          durationInFrames,
          fps,
          width: renderConfig.width ?? 1920,
          height: renderConfig.height ?? 1080,
          props: {
            scenes,
            phrases,
            transitionDurationFrames: transitionFrames,
            renderConfig,
          },
        };
      }}
    />
  );
};
