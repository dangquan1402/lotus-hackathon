"""Test ElevenLabs TTS generation."""

import asyncio
from pathlib import Path

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


async def main():
    from app.services.voice_gen import agenerate_voice

    text = (
        "Welcome to today's lesson on neural networks. "
        "Neural networks are computing systems inspired by the brain. "
        "They learn patterns from data to make predictions."
    )
    output_path = OUTPUT_DIR / "test_elevenlabs.mp3"

    print(f"Generating ElevenLabs audio for: {text[:60]}...")
    result = await agenerate_voice(text, output_path, provider="elevenlabs")
    print(f"Generated: {result} ({result.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
