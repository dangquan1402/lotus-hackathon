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
    """Generate a video by calling the Remotion render service.

    Args:
        session_id: Unique session ID.
        content: GeneratedContent dict with title and sections.
        images_dir: Directory containing scene images (unused — service reads from shared volume).
        audio_path: Path to narration WAV (unused — service reads from shared volume).
        output_dir: Directory for rendered MP4 (unused — service writes to shared volume).
        alignment: Optional word-level alignment data for captions.

    Returns:
        Path to the rendered MP4 file.
    """
    # Build scenes from content sections and alignment data
    sections = content.get("sections", [])
    words = (alignment or {}).get("words", [])

    # Calculate per-section timing from alignment
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
            # Fallback: evenly distribute
            duration_per_word = 0.4
            start_s = i * section_word_count * duration_per_word
            end_s = start_s + section_word_count * duration_per_word

        scenes.append(
            {
                "index": i,
                "duration_s": round(end_s - start_s, 2),
                "caption": section["narration_text"],
                "image_prompt": section["image_prompt"],
                "audio_start_s": round(start_s, 2),
                "audio_end_s": round(end_s, 2),
            }
        )

    # Build phrases from alignment words for captions
    phrases = []
    if words:
        # Group words into phrases (~8 words each)
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

    output_path = Path(result["video_path"])
    return output_path
