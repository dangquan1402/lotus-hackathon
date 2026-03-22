import asyncio
import base64
import json
import os
import re
from pathlib import Path

import httpx

CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODEL = "gemini-3.1-flash-image"

GROK_BASE_URL = os.environ.get("GROK_API_URL", "http://host.docker.internal:8420")
_GROK_SEM = asyncio.Semaphore(4)  # max 4 concurrent Grok requests

# Map size_hint "WxH" to Grok aspect_ratio
_SIZE_TO_ASPECT: dict[str, str] = {
    "1280x720": "16:9",
    "720x1280": "9:16",
    "1024x1024": "1:1",
    "1080x1080": "1:1",
    "1200x800": "3:2",
    "800x1200": "2:3",
}

STYLE_PREFIXES = {
    "cartoon": "Colorful cartoon illustration style, bold outlines, friendly and playful. ",
    "watercolor": "Soft watercolor painting style, gentle colors, artistic and dreamy. ",
    "photorealistic": "Photorealistic high-quality photograph, detailed and lifelike. ",
    "minimalist": (
        "Clean minimalist vector illustration, simple shapes, flat design, limited color palette. "
    ),
    "anime": "Anime/manga art style, vibrant colors, expressive characters. ",
    "scientific": "Scientific textbook diagram style, labeled, clear and educational. ",
    "3d_render": "3D rendered illustration, smooth lighting, modern CGI quality. ",
}


def load_fuseapi_config() -> tuple[str, str]:
    """Load FuseAPI endpoint and API key from ~/.fuseapi/config.json.

    Returns:
        Tuple of (endpoint_url, api_key).
    """
    config = json.loads(CONFIG_PATH.read_text())
    profile = config["profiles"][config["default"]]
    endpoint = profile["endpoint"]
    endpoint = re.sub(r"^(https?):(?!//)", r"\1://", endpoint)
    return endpoint, profile["apiKey"]


async def _generate_image_fuseapi(
    prompt: str, output_path: Path, size_hint: str = "1280x720", style: str | None = None
) -> Path:
    """Generate an image using FuseAPI (Gemini) and save to disk."""
    full_prompt = STYLE_PREFIXES.get(style, "") + prompt if style else prompt
    endpoint, api_key = load_fuseapi_config()
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{endpoint}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            f"{full_prompt} Image dimensions: {size_hint} pixels,"
                            " landscape orientation."
                        ),
                    }
                ],
                "modalities": ["image", "text"],
            },
        )
        response.raise_for_status()

    data = response.json()
    images = data["choices"][0]["message"].get("images", [])
    if not images:
        raise ValueError(f"No images in response: {data}")

    img_url: str = images[0]["image_url"]["url"]
    b64 = img_url.split(",", 1)[1]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(b64))
    return output_path


async def _generate_image_grok(
    prompt: str, output_path: Path, size_hint: str = "1280x720", style: str | None = None
) -> Path:
    """Generate an image using Grok Imagine API and save to disk."""
    full_prompt = STYLE_PREFIXES.get(style, "") + prompt if style else prompt
    aspect_ratio = _SIZE_TO_ASPECT.get(size_hint, "16:9")

    async with _GROK_SEM:
        response = None
        async with httpx.AsyncClient(timeout=120) as client:
            for attempt in range(3):
                response = await client.post(
                    f"{GROK_BASE_URL}/api/generate-images",
                    json={
                        "prompt": full_prompt[:500],
                        "aspect_ratio": aspect_ratio,
                        "num_images": 1,
                    },
                )
                if response.status_code >= 500 and attempt < 2:
                    await asyncio.sleep(2)
                    continue
                break
            response.raise_for_status()

        data = response.json()
        images = data.get("images", [])
        if not images:
            raise ValueError(f"No images in Grok response: {data}")

        # Download the image from Grok's static server
        image_url = images[0]["url"]
        async with httpx.AsyncClient(timeout=60) as client:
            img_response = await client.get(f"{GROK_BASE_URL}{image_url}")
            img_response.raise_for_status()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(img_response.content)
    return output_path


async def agenerate_image(
    prompt: str,
    output_path: Path,
    size_hint: str = "1280x720",
    style: str | None = None,
    provider: str = "grok",
) -> Path:
    """Generate an image from a text prompt and save to disk.

    Args:
        prompt: Detailed visual description for the image.
        output_path: File path where the generated image will be saved.
        size_hint: Desired image dimensions as "WxH" string.
        style: Optional style name to prepend style instructions to the prompt.
        provider: Image generation provider — "fuseapi" (default) or "grok".

    Returns:
        The output_path after the image has been written.

    Raises:
        httpx.HTTPError: On API communication failure.
        ValueError: If the response contains no images or provider is unknown.
    """
    if provider == "grok":
        return await _generate_image_grok(prompt, output_path, size_hint, style)
    if provider == "fuseapi":
        return await _generate_image_fuseapi(prompt, output_path, size_hint, style)
    raise ValueError(f"Unknown image provider: {provider!r}. Use 'fuseapi' or 'grok'.")
