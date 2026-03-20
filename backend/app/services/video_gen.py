import asyncio
import json
import shutil
from pathlib import Path

REMOTION_DIR = Path(__file__).parent.parent.parent.parent / "remotion"


async def agenerate_video(
    session_id: int,
    content: dict,
    images_dir: Path,
    audio_path: Path,
    output_dir: Path,
) -> Path:
    """Generate a video using Remotion by orchestrating scenes and audio.

    Copies images and audio into the Remotion public directory, writes
    story-scenes.json, then invokes the Remotion CLI to render the video.

    Args:
        session_id: Unique session ID used in the output filename.
        content: GeneratedContent dict with title and sections.
        images_dir: Directory containing scene images named scene_XX.jpg.
        audio_path: Path to the narration WAV file.
        output_dir: Directory where the rendered MP4 will be saved.

    Returns:
        Path to the rendered MP4 file.

    Raises:
        RuntimeError: If the Remotion render process exits with a non-zero code.
    """
    public_dir = REMOTION_DIR / "public"
    public_dir.mkdir(parents=True, exist_ok=True)

    # Copy images to remotion/public/
    for img in images_dir.glob("*.jpg"):
        shutil.copy(img, public_dir / img.name)
    shutil.copy(audio_path, public_dir / "narration.wav")

    # Build scenes JSON for Remotion
    scenes = []
    for i, section in enumerate(content.get("sections", [])):
        scenes.append(
            {
                "index": i,
                "duration_s": section.get("duration_s", 8),
                "timestamp": f"{i * 8}s",
                "caption": section["narration_text"],
                "image_prompt": section["image_prompt"],
                "audio_start_s": i * 8,
                "audio_end_s": (i + 1) * 8,
            }
        )

    story_data = {
        "title": content["title"],
        "scenes": scenes,
        "phrases": [],
        "render_config": {
            "fps": 30,
            "width": 1920,
            "height": 1080,
            "layout": "overlay",
        },
    }
    (public_dir / "story-scenes.json").write_text(json.dumps(story_data, indent=2))

    output_path = output_dir / f"lesson_{session_id}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    proc = await asyncio.create_subprocess_exec(
        "npx",
        "remotion",
        "render",
        "src/index.ts",
        "LessonVideo",
        str(output_path),
        cwd=str(REMOTION_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"Remotion render failed: {stderr.decode()}")

    return output_path
