"""Simple test for FuseAPI image generation."""

import asyncio
from pathlib import Path

from app.services.image_gen import agenerate_image

OUTPUT = Path("output/test_image.jpg")


async def main():
    print("Generating test image via FuseAPI...")
    path = await agenerate_image(
        prompt="A friendly robot teacher standing at a whiteboard, explaining a diagram about neural networks, colorful cartoon style",
        output_path=OUTPUT,
        size_hint="1280x720",
    )
    print(f"Saved to: {path} ({path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
