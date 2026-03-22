export interface ClipImage {
  file: string;
  duration_s: number;
}

export interface Scene {
  index: number;
  duration_s: number;
  caption: string;
  image_prompt: string;
  audio_start_s: number;
  audio_end_s: number;
  scene_type?: "illustration" | "title_card";
  title_card_number?: number;
  title_card_text?: string;
  clip_images?: ClipImage[];
}

export interface Phrase {
  index: number;
  start_s: number;
  end_s: number;
  text: string;
}

export interface RenderConfig {
  fps?: number;
  width?: number;
  height?: number;
  transition_frames?: number;
  caption_font_size?: number;
  caption_color?: string;
  bg_color?: string;
  title_card_bg_color?: string;
  title_card_text_color?: string;
  layout?: "overlay" | "static_caption_below";
}

export interface LessonData {
  title: string;
  scenes: Scene[];
  phrases?: Phrase[];
  audio_file?: string;
  render_config?: RenderConfig;
}

export interface LessonVideoProps {
  scenes: Scene[];
  phrases: Phrase[];
  transitionDurationFrames: number;
  renderConfig: RenderConfig;
  audioFile: string;
}
