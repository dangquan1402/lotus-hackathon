import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { ClipImage, LessonVideoProps, Scene } from "./types";
import { KenBurnsScene, getDirection } from "./KenBurnsScene";
import { TitleCardScene } from "./TitleCardScene";
import { PhraseCaption } from "./PhraseCaption";

const DEFAULT_FPS = 30;
const IMAGE_RATIO = 0.75; // top 75% for image
const CLIP_CROSSFADE_FRAMES = 10;

const CLIP_SOURCE_DURATION_S = 6; // Grok generates 6s clips

/** Multi-clip scene: cycles through clip images/videos with crossfade.
 *  For video clips (.mp4), adjusts playback rate to match target duration. */
const MultiClipScene: React.FC<{
  clips: ClipImage[];
  fps: number;
  sceneIndex: number;
  layout: string;
}> = ({ clips, fps, sceneIndex, layout }) => {
  const imageStyle: React.CSSProperties =
    layout === "static_caption_below"
      ? { width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }
      : { width: "100%", height: "100%", objectFit: "cover" };

  return (
    <TransitionSeries>
      {clips.map((clip, ci) => {
        const isVideo = clip.file.endsWith(".mp4");
        const hasNext = ci < clips.length - 1;
        const durationInFrames =
          Math.round(clip.duration_s * fps) +
          (hasNext ? CLIP_CROSSFADE_FRAMES : 0);

        // For video clips: speed up/slow down to fill the target duration
        const playbackRate = isVideo
          ? CLIP_SOURCE_DURATION_S / clip.duration_s
          : 1;

        return (
          <React.Fragment key={ci}>
            {ci > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: CLIP_CROSSFADE_FRAMES })}
              />
            )}
            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
              <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
                {isVideo ? (
                  <OffthreadVideo
                    src={staticFile(clip.file)}
                    style={imageStyle}
                    playbackRate={playbackRate}
                    muted
                  />
                ) : (
                  <Img src={staticFile(clip.file)} style={imageStyle} />
                )}
              </AbsoluteFill>
            </TransitionSeries.Sequence>
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};

function renderSceneContent(
  scene: Scene,
  i: number,
  layout: string,
  fps: number
): React.ReactNode {
  const clipImages = scene.clip_images;

  if (scene.scene_type === "title_card") {
    return (
      <TitleCardScene
        sectionNumber={scene.title_card_number ?? 1}
        titleText={scene.title_card_text ?? scene.caption}
        totalSections={5}
      />
    );
  }

  // Multi-clip scene
  if (clipImages && clipImages.length > 0) {
    if (layout === "static_caption_below") {
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${IMAGE_RATIO * 100}%`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <MultiClipScene
            clips={clipImages}
            fps={fps}
            sceneIndex={scene.index}
            layout={layout}
          />
        </div>
      );
    }
    return (
      <MultiClipScene
        clips={clipImages}
        fps={fps}
        sceneIndex={scene.index}
        layout={layout}
      />
    );
  }

  // Single image fallback
  const sceneId = String(scene.index).padStart(2, "0");
  const imagePath = staticFile(`scene_${sceneId}_00.jpg`);

  if (layout === "static_caption_below") {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${IMAGE_RATIO * 100}%`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Img
          src={imagePath}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
      </div>
    );
  }

  return <KenBurnsScene imageSrc={imagePath} direction={getDirection(i)} />;
}

export const LessonVideo: React.FC<LessonVideoProps> = ({
  scenes,
  phrases,
  transitionDurationFrames,
  renderConfig,
}) => {
  const fps = renderConfig.fps ?? DEFAULT_FPS;
  const layout = renderConfig.layout ?? "overlay";
  const bgColor = renderConfig.bg_color ?? (layout === "static_caption_below" ? "#000000" : "#000000");

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <Audio src={staticFile("narration.wav")} />

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
                <AbsoluteFill>
                  {renderSceneContent(scene, i, layout, fps)}
                </AbsoluteFill>
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {phrases.length > 0 && (
        <PhraseCaption phrases={phrases} renderConfig={renderConfig} layout={layout} />
      )}
    </AbsoluteFill>
  );
};
