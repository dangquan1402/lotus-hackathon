"""Generate images for the Lumina pitch deck using Grok Imagine API."""

import httpx
import os
from pathlib import Path

GROK_API = "http://localhost:8420"
OUTPUT_DIR = Path("deck_images")


def generate_image(prompt: str, filename: str, aspect_ratio: str = "16:9") -> Path:
    """Generate an image and save it."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    out_path = OUTPUT_DIR / filename

    if out_path.exists():
        print(f"  SKIP (exists): {filename}")
        return out_path

    print(f"  Generating: {filename}...")
    resp = httpx.post(
        f"{GROK_API}/api/generate-images",
        json={"prompt": prompt, "aspect_ratio": aspect_ratio, "num_images": 1},
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    image_url = data["images"][0]["url"]

    img_resp = httpx.get(f"{GROK_API}{image_url}", timeout=60)
    img_resp.raise_for_status()
    out_path.write_bytes(img_resp.content)
    print(f"  Saved: {filename}")
    return out_path


def main():
    images = [
        {
            "prompt": "A beautiful minimalist illustration of a glowing diamond gemstone floating above an open book, with golden light rays emanating outward, dark green and cream color palette, elegant and luxurious educational brand identity, clean professional design",
            "filename": "slide1_hero.jpg",
        },
        {
            "prompt": "A frustrated diverse group of students in a traditional classroom, one-size-fits-all education concept, some students bored, some confused, some disengaged, muted colors with warm lighting, editorial illustration style, 16:9 cinematic",
            "filename": "slide2_problem.jpg",
        },
        {
            "prompt": "A futuristic AI learning platform interface showing personalized content adapting in real-time for different learners, holographic screens with videos slides quizzes mind maps, warm golden and dark green color scheme, sleek modern UI design, tech illustration",
            "filename": "slide3_solution.jpg",
        },
        {
            "prompt": "A technical architecture diagram visualization showing data flowing through interconnected nodes: User Profile to Pre-Assessment to Web Search to AI Content Generation to Multi-modal Output, dark green nodes with golden connecting lines on cream background, clean infographic style",
            "filename": "slide4_architecture.jpg",
        },
        {
            "prompt": "A grid of 9 feature icons showing: chat bubbles, video camera, presentation slides, quiz checkmark, brain mind map, flashcards, analytics chart, AI robot tutor, animated video frames — all in a cohesive dark green and gold design system, flat vector icon style",
            "filename": "slide5_features.jpg",
        },
        {
            "prompt": "A live demo screen showing a beautiful educational app with a student exploring 'How black holes work', showing video lesson, slides with AI-generated space images, and an AI chat tutor conversation, dark green sidebar navigation, warm cream background, modern web app design",
            "filename": "slide6_demo.jpg",
        },
        {
            "prompt": "A split comparison showing traditional static education on the left (gray, boring textbook) versus AI-powered personalized learning on the right (colorful, interactive, with multiple modalities), dramatic lighting, editorial style",
            "filename": "slide7_differentiator.jpg",
        },
        {
            "prompt": "A futuristic vision of education: students learning in different settings — a child with a tablet seeing animated dinosaurs, a medical student with 3D anatomy, a professional with AI-generated business charts, all connected by golden neural network lines, warm optimistic lighting",
            "filename": "slide9_vision.jpg",
        },
    ]

    print(f"Generating {len(images)} deck images...\n")
    for img in images:
        generate_image(img["prompt"], img["filename"])

    print(f"\nDone! Images saved to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
