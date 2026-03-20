import struct
import wave
from pathlib import Path


async def agenerate_voice(text: str, output_path: Path) -> Path:
    """Generate voice audio from text and save to disk.

    Currently a stub that generates a silent WAV placeholder.
    Replace the body with a real TTS API call to localhost:8882.

    Args:
        text: The narration text to convert to speech.
        output_path: File path where the audio will be saved.

    Returns:
        The output_path after the audio file has been written.
    """
    # TODO: integrate with local TTS model at localhost:8882
    # For now, create a silent WAV placeholder proportional to word count
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration_s = max(3, len(text.split()) * 0.4)
    frames = int(sample_rate * duration_s)

    with wave.open(str(output_path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(struct.pack(f"<{frames}h", *([0] * frames)))

    return output_path
