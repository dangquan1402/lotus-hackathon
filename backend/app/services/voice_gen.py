import os
import shutil
from pathlib import Path

import httpx

VOICE_API = os.environ.get("VOICE_API_URL", "http://localhost:8882")

# ElevenLabs config
ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY", "sk_8807e2ea893d23c16e790b734607ee4e94fe89817b3ed86e"
)
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
ELEVENLABS_MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")


# ---------------------------------------------------------------------------
# Local MLX Chatterbox TTS
# ---------------------------------------------------------------------------


async def _generate_voice_local(text: str, output_path: Path) -> Path:
    """Generate voice audio from text via local Chatterbox TTS API."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{VOICE_API}/generate",
            data={"text": text},
        )
        resp.raise_for_status()
        result = resp.json()

    source = Path(result["audio_path"])
    container_source = Path("/voice-outputs") / source.name
    if container_source.exists():
        shutil.copy(container_source, output_path)
    else:
        shutil.copy(source, output_path)
    return output_path


async def _align_audio_local(audio_path: Path, language: str = "en") -> dict:
    """Run word-level alignment on audio via local Whisper."""
    async with httpx.AsyncClient(timeout=120) as client:
        with open(audio_path, "rb") as f:
            resp = await client.post(
                f"{VOICE_API}/align",
                files={"audio": ("narration.wav", f, "audio/wav")},
                data={"language": language},
            )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# ElevenLabs TTS
# ---------------------------------------------------------------------------


async def _generate_voice_elevenlabs(text: str, output_path: Path) -> Path:
    """Generate voice audio from text via ElevenLabs API."""
    from elevenlabs import ElevenLabs

    output_path.parent.mkdir(parents=True, exist_ok=True)

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    # Use convert() which returns audio bytes directly
    audio_iterator = client.text_to_speech.convert(
        voice_id=ELEVENLABS_VOICE_ID,
        text=text,
        model_id=ELEVENLABS_MODEL_ID,
        output_format="mp3_44100_128",
    )

    # Write audio chunks to file
    with open(output_path, "wb") as f:
        for chunk in audio_iterator:
            f.write(chunk)

    return output_path


async def _align_tts_elevenlabs(text: str) -> dict:
    """Get word-level timestamps from ElevenLabs TTS convert_with_timestamps.

    Uses the TTS endpoint to re-synthesize and extract character-level timings,
    then aggregates them into word-level timestamps.

    Returns alignment dict compatible with the local Whisper format:
    {"words": [{"word": ..., "start": ..., "end": ...}, ...], "text": ...}
    """
    from elevenlabs import ElevenLabs

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    response = client.text_to_speech.convert_with_timestamps(
        voice_id=ELEVENLABS_VOICE_ID,
        text=text,
        model_id=ELEVENLABS_MODEL_ID,
        output_format="mp3_44100_128",
    )

    # Parse character-level timings into word-level timings
    words = []
    current_word = ""
    word_start = None
    word_end = 0.0

    alignment = getattr(response, "alignment", None)
    if alignment:
        characters = alignment.get("characters", []) if isinstance(alignment, dict) else []
        for char_info in characters:
            char = char_info.get("character", "")
            start = char_info.get("character_start_times_seconds", char_info.get("start", 0))
            word_end = char_info.get("character_end_times_seconds", char_info.get("end", 0))

            if char in (" ", "\n"):
                if current_word:
                    words.append({"word": current_word, "start": word_start, "end": word_end})
                    current_word = ""
                    word_start = None
            else:
                if word_start is None:
                    word_start = start
                current_word += char

        # Flush last word
        if current_word:
            words.append({"word": current_word, "start": word_start, "end": word_end})

    return {"words": words, "text": text}


async def _align_stt_elevenlabs(audio_path: Path, language: str = "en") -> dict:
    """Transcribe audio and get word-level timestamps via ElevenLabs Scribe STT.

    Uses the STT endpoint to transcribe an existing audio file and extract
    word-level timestamps directly from the transcription.

    Returns alignment dict compatible with the local Whisper format:
    {"words": [{"word": ..., "start": ..., "end": ...}, ...], "text": ...}
    """
    from elevenlabs import ElevenLabs

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    with open(audio_path, "rb") as f:
        response = client.speech_to_text.convert(
            file=f,
            model_id="scribe_v1",
            language_code=language,
            timestamps_granularity="word",
        )

    # Map ElevenLabs word objects to our standard format, skip whitespace-only tokens
    words = []
    for w in getattr(response, "words", []) or []:
        text = w.text if hasattr(w, "text") else w.get("text", "")
        if not text.strip():
            continue
        words.append(
            {
                "word": text.strip(),
                "start": w.start if hasattr(w, "start") else w.get("start", 0),
                "end": w.end if hasattr(w, "end") else w.get("end", 0),
            }
        )

    return {"words": words, "text": response.text}


# ---------------------------------------------------------------------------
# Public API — dispatches based on provider
# ---------------------------------------------------------------------------


async def agenerate_voice(text: str, output_path: Path, provider: str = "local") -> Path:
    """Generate voice audio from text.

    Args:
        text: The narration text to convert to speech.
        output_path: File path where the audio will be saved.
        provider: "local" for MLX Chatterbox or "elevenlabs" for ElevenLabs.

    Returns:
        The output_path after the audio file has been written.
    """
    if provider == "elevenlabs":
        # ElevenLabs outputs mp3; adjust extension if needed
        if output_path.suffix == ".wav":
            output_path = output_path.with_suffix(".mp3")
        return await _generate_voice_elevenlabs(text, output_path)
    return await _generate_voice_local(text, output_path)


async def aalign_audio(
    audio_path: Path,
    language: str = "en",
    provider: str = "local",
    text: str = "",
) -> dict:
    """Run word-level alignment on audio.

    Args:
        audio_path: Path to audio file.
        language: Language code for alignment.
        provider: Alignment backend to use:
            - "local" — local Whisper via voice-clone API
            - "elevenlabs" — ElevenLabs Scribe STT (transcribes audio file)
            - "elevenlabs_tts" — ElevenLabs TTS with timestamps (re-synthesizes text)
        text: Original text (only needed for "elevenlabs_tts" provider).

    Returns:
        Dict with "words" (list of {word, start, end}), and "text".
    """
    if provider == "elevenlabs":
        return await _align_stt_elevenlabs(audio_path, language)
    if provider == "elevenlabs_tts":
        return await _align_tts_elevenlabs(text)
    return await _align_audio_local(audio_path, language)
