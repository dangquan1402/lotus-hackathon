import os
from pathlib import Path

import httpx

REMOTION_API = os.environ.get("REMOTION_API_URL", "http://localhost:3100")

CLAUSE_STARTERS = {
    "and", "but", "or", "yet", "nor", "for", "so",
    "who", "which", "that", "where", "when", "while",
    "although", "because", "since", "if", "as", "until",
    "unless", "though",
}
MAX_WORDS, HARD_MAX, PAUSE_THRESHOLD = 10, 14, 0.3


def _build_phrases(words: list[dict]) -> list[dict]:
    """Build natural caption phrases from alignment words.

    Splits at punctuation, pauses, and clause boundaries instead of
    fixed word counts, then merges orphan segments.
    """
    if not words:
        return []

    segments: list[dict] = []
    cur_txt: list[str] = []
    cur_ts: list[dict] = []

    def flush() -> None:
        if not cur_txt:
            return
        segments.append({
            "index": len(segments),
            "start_s": round(cur_ts[0]["start"], 2),
            "end_s": round(cur_ts[-1]["end"], 2),
            "text": " ".join(cur_txt),
        })
        cur_txt.clear()
        cur_ts.clear()

    for i, w in enumerate(words):
        cur_txt.append(w["word"])
        cur_ts.append(w)
        n = len(cur_txt)
        is_last = i == len(words) - 1
        has_pause = not is_last and (words[i + 1]["start"] - w["end"]) > PAUSE_THRESHOLD
        has_period = w["word"].rstrip("\"'").endswith((".", "?", "!"))
        has_comma = w["word"].endswith(",") and n >= 4

        if is_last or has_period or has_comma:
            flush()
            continue
        if has_pause and n >= 3:
            flush()
            continue
        if n >= MAX_WORDS:
            # Look ahead for a natural break within 3 words
            lb = None
            for j in range(1, min(4, len(words) - i)):
                fw = words[i + j]["word"]
                if fw.rstrip("\"'").endswith((".", "?", "!")) or (
                    fw.endswith(",") and n + j >= 4
                ):
                    lb = j
                    break
                if (
                    j < len(words) - i - 1
                    and words[i + j + 1]["start"] - words[i + j]["end"] > PAUSE_THRESHOLD
                ):
                    lb = j
                    break
            if lb is not None and n + lb <= HARD_MAX:
                continue
            # Try splitting at a clause starter
            best = None
            for k in range(n - 1, max(2, n - 5), -1):
                if cur_txt[k].lower().rstrip(".,!?;:'\"") in CLAUSE_STARTERS:
                    best = k
                    break
            if best is not None and best >= 3:
                tb = " ".join(cur_txt[:best])
                tsb = cur_ts[:best]
                rt = cur_txt[best:]
                rts = cur_ts[best:]
                cur_txt.clear()
                cur_ts.clear()
                segments.append({
                    "index": len(segments),
                    "start_s": round(tsb[0]["start"], 2),
                    "end_s": round(tsb[-1]["end"], 2),
                    "text": tb,
                })
                cur_txt.extend(rt)
                cur_ts.extend(rts)
                continue
            if n >= HARD_MAX:
                flush()
    flush()

    # Merge orphan segments (< 0.5s and <= 2 words) into next
    merged: list[dict] = []
    i = 0
    while i < len(segments):
        s = segments[i]
        if (
            (s["end_s"] - s["start_s"]) < 0.5
            and len(s["text"].split()) <= 2
            and i < len(segments) - 1
        ):
            nxt = segments[i + 1]
            merged.append({
                "index": len(merged),
                "start_s": s["start_s"],
                "end_s": nxt["end_s"],
                "text": s["text"] + " " + nxt["text"],
            })
            i += 2
        else:
            s["index"] = len(merged)
            merged.append(s)
            i += 1

    return merged


async def agenerate_video(
    session_id: int,
    content: dict,
    images_dir: Path,
    audio_path: Path,
    output_dir: Path,
    alignment: dict | None = None,
    use_animated: bool = False,
) -> Path:
    """Generate a video by calling the Remotion render service.

    Args:
        use_animated: If True, use animated .mp4 clips (from Grok)
            instead of static .jpg images with Ken Burns effect.
    """
    sections = content.get("sections", [])
    words = (alignment or {}).get("words", [])

    # Build scenes with clip_images for multi-image sections
    scenes = []
    word_idx = 0
    for i, section in enumerate(sections):
        section_word_count = len(section["narration_text"].split())

        if words and word_idx < len(words):
            start_s = words[word_idx]["start"]
            is_last_section = i == len(sections) - 1
            if is_last_section:
                # Last section gets ALL remaining alignment words
                # (Whisper may split words differently than text.split())
                end_s = words[-1]["end"]
                word_idx = len(words)
            else:
                end_idx = min(word_idx + section_word_count, len(words)) - 1
                end_s = words[end_idx]["end"]
                word_idx += section_word_count
        else:
            duration_per_word = 0.4
            start_s = i * section_word_count * duration_per_word
            end_s = start_s + section_word_count * duration_per_word

        duration_s = round(end_s - start_s, 2)

        # Build clip_images for the scene
        num_prompts = len(
            section.get("image_prompts")
            or [section.get("image_prompt", "")]
        )
        num_prompts = max(num_prompts, 1)
        clip_duration = duration_s / num_prompts

        clip_images = []
        clips_dir = images_dir.parent / "clips"
        for j in range(num_prompts):
            mp4_path = clips_dir / f"scene_{i:02d}_{j:02d}.mp4"
            if use_animated and mp4_path.exists():
                # Animated clip — Remotion will adjust playback rate
                clip_images.append({
                    "file": f"scene_{i:02d}_{j:02d}.mp4",
                    "duration_s": round(clip_duration, 2),
                })
            else:
                # Static image — Ken Burns or multi-clip with crossfade
                clip_images.append({
                    "file": f"scene_{i:02d}_{j:02d}.jpg",
                    "duration_s": round(clip_duration, 2),
                })

        scenes.append(
            {
                "index": i,
                "duration_s": duration_s,
                "caption": section["narration_text"],
                "image_prompt": (section.get("image_prompts") or [""])[0],
                "audio_start_s": round(start_s, 2),
                "audio_end_s": round(end_s, 2),
                "clip_images": clip_images,
            }
        )

    # Build phrases from alignment words — clause-aware splitting
    phrases = _build_phrases(words)

    # Compensate for TransitionSeries overlap and frame rounding:
    # Remotion total = sum(scene_frames) - (N-1)*transition_frames
    # Each scene also loses up to 0.5 frames from Math.round().
    # Add overlap + 1s safety buffer to the last scene so video >= audio.
    transition_frames = 15
    fps_val = 30
    num_transitions = max(len(scenes) - 1, 0)
    total_overlap_s = num_transitions * (transition_frames / fps_val)
    if scenes and total_overlap_s > 0:
        pad_per_scene = total_overlap_s / len(scenes)
        for sc in scenes:
            sc["duration_s"] = round(sc["duration_s"] + pad_per_scene, 2)
            if sc.get("clip_images"):
                clip_pad = pad_per_scene / len(sc["clip_images"])
                for ci in sc["clip_images"]:
                    ci["duration_s"] = round(ci["duration_s"] + clip_pad, 2)
    # Add 1s buffer to last scene to cover alignment-to-audio gap + rounding
    if scenes:
        scenes[-1]["duration_s"] = round(scenes[-1]["duration_s"] + 1.0, 2)
        if scenes[-1].get("clip_images"):
            last_clips = scenes[-1]["clip_images"]
            last_clips[-1]["duration_s"] = round(last_clips[-1]["duration_s"] + 1.0, 2)

    render_config = {
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "layout": "static_caption_below",
    }

    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(
            f"{REMOTION_API}/render",
            json={
                "session_id": session_id,
                "scenes": scenes,
                "phrases": phrases,
                "render_config": render_config,
            },
        )
        resp.raise_for_status()
        result = resp.json()

    if result.get("status") == "error":
        raise RuntimeError(f"Remotion render failed: {result.get('error')}")

    return Path(result["video_path"])
