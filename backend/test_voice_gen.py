"""Test voice generation and alignment via voice-clone API (localhost:8882)."""

import json
from pathlib import Path

import httpx

VOICE_API = "http://localhost:8882"
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def test_generate():
    """Generate narration audio from text."""
    text = (
        "Welcome to today's lesson on neural networks. "
        "Neural networks are computing systems inspired by the brain. "
        "They learn patterns from data to make predictions."
    )
    print(f"Generating audio for: {text[:60]}...")

    resp = httpx.post(
        f"{VOICE_API}/generate",
        data={"text": text},
        timeout=120,
    )
    resp.raise_for_status()
    result = resp.json()
    audio_path = Path(result["audio_path"])
    print(f"Generated: {audio_path} ({audio_path.stat().st_size / 1024:.1f} KB)")
    return audio_path


def test_align(audio_path: Path):
    """Run word-level alignment on generated audio."""
    print(f"Aligning: {audio_path}...")

    with open(audio_path, "rb") as f:
        resp = httpx.post(
            f"{VOICE_API}/align",
            files={"audio": ("narration.wav", f, "audio/wav")},
            data={"language": "en"},
            timeout=120,
        )
    resp.raise_for_status()
    result = resp.json()

    print(f"Transcription: {result['text']}")
    print(f"Words aligned: {len(result['words'])}")
    print("First 10 words:")
    for w in result["words"][:10]:
        print(f"  [{w['start']:.2f}-{w['end']:.2f}] {w['word']} (p={w['probability']:.2f})")

    # Save alignment result
    align_path = OUTPUT_DIR / "test_alignment.json"
    align_path.write_text(json.dumps(result, indent=2))
    print(f"Alignment saved to: {align_path}")
    return result


if __name__ == "__main__":
    audio = test_generate()
    print("---")
    test_align(audio)
    print("\nAll tests passed!")
