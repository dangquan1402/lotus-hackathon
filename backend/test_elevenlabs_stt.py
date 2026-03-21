"""Test ElevenLabs STT alignment on existing audio."""

import asyncio
import json
from pathlib import Path


async def main():
    from app.services.voice_gen import aalign_audio

    audio_path = Path("output/test_elevenlabs.mp3")
    if not audio_path.exists():
        print(f"Audio file not found: {audio_path}")
        return

    print(f"Aligning via ElevenLabs Scribe STT: {audio_path}")
    result = await aalign_audio(audio_path, provider="elevenlabs")

    print(f"\nTranscription: {result['text']}")
    print(f"Words aligned: {len(result['words'])}")
    print("\nWord timestamps:")
    for w in result["words"]:
        print(f"  [{w['start']:.2f} - {w['end']:.2f}] {w['word']}")

    out = Path("output/test_elevenlabs_stt_alignment.json")
    out.write_text(json.dumps(result, indent=2))
    print(f"\nSaved to: {out}")


if __name__ == "__main__":
    asyncio.run(main())
