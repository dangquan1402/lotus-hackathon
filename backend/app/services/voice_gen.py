import os
import shutil
from pathlib import Path

import httpx

VOICE_API = os.environ.get("VOICE_API_URL", "http://localhost:8882")


async def agenerate_voice(text: str, output_path: Path) -> Path:
    """Generate voice audio from text via Chatterbox TTS API.

    Args:
        text: The narration text to convert to speech.
        output_path: File path where the audio WAV will be saved.

    Returns:
        The output_path after the audio file has been written.

    Raises:
        httpx.HTTPError: On API communication failure.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{VOICE_API}/generate",
            data={"text": text},
        )
        resp.raise_for_status()
        result = resp.json()

    # The API saves the WAV on host and returns its path.
    # In Docker, voice outputs are mounted at /voice-outputs/
    source = Path(result["audio_path"])
    container_source = Path("/voice-outputs") / source.name
    if container_source.exists():
        shutil.copy(container_source, output_path)
    else:
        shutil.copy(source, output_path)
    return output_path


async def aalign_audio(audio_path: Path, language: str = "en") -> dict:
    """Run word-level alignment on audio via Whisper.

    Args:
        audio_path: Path to WAV audio file.
        language: Language code for alignment.

    Returns:
        Dict with "words" (list of {word, start, end, probability}),
        "segments", and "text".
    """
    async with httpx.AsyncClient(timeout=120) as client:
        with open(audio_path, "rb") as f:
            resp = await client.post(
                f"{VOICE_API}/align",
                files={"audio": ("narration.wav", f, "audio/wav")},
                data={"language": language},
            )
        resp.raise_for_status()
        return resp.json()
