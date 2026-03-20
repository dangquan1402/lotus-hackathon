import os
from pathlib import Path

import httpx

REMOTION_API = os.environ.get("REMOTION_API_URL", "http://localhost:3100")


async def agenerate_video(
    session_id: int,
    content: dict,
    images_dir: Path,
    audio_path: Path,
    output_dir: Path,
    alignment: dict | None = None,
) -> Path:
    """Generate a video by calling the Remotion render service."""
    sections = content.get("sections", [])
    words = (alignment or {}).get("words", [])

    # Build scenes with clip_images for multi-image sections
    scenes = []
    word_idx = 0
    for i, section in enumerate(sections):
        section_word_count = len(section["narration_text"].split())

        if words and word_idx < len(words):
            start_s = words[word_idx]["start"]
            end_idx = min(word_idx + section_word_count, len(words)) - 1
            end_s = words[end_idx]["end"]
            word_idx += section_word_count
        else:
            duration_per_word = 0.4
            start_s = i * section_word_count * duration_per_word
            end_s = start_s + section_word_count * duration_per_word

        duration_s = round(end_s - start_s, 2)

        # Build clip_images for multi-image scenes
        num_prompts = len(section.get("image_prompts") or [section.get("image_prompt", "")])
        num_prompts = max(num_prompts, 1)
        clip_duration = duration_s / num_prompts
        clip_images = [
            {
                "file": f"scene_{i:02d}_{j:02d}.jpg",
                "duration_s": round(clip_duration, 2),
            }
            for j in range(num_prompts)
        ]

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

    # Build phrases from alignment words for captions
    phrases = []
    if words:
        phrase_size = 8
        for pi in range(0, len(words), phrase_size):
            chunk = words[pi : pi + phrase_size]
            phrases.append(
                {
                    "index": pi // phrase_size,
                    "start_s": chunk[0]["start"],
                    "end_s": chunk[-1]["end"],
                    "text": " ".join(w["word"] for w in chunk),
                }
            )

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
