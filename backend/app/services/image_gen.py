import base64
import json
import re
from pathlib import Path

import httpx

CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODEL = "gemini-3.1-flash-image"


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


async def agenerate_image(prompt: str, output_path: Path, size_hint: str = "1280x720") -> Path:
    """Generate an image from a text prompt using FuseAPI and save to disk.

    Args:
        prompt: Detailed visual description for the image.
        output_path: File path where the generated image will be saved.
        size_hint: Desired image dimensions as "WxH" string.

    Returns:
        The output_path after the image has been written.

    Raises:
        httpx.HTTPError: On API communication failure.
        ValueError: If the response contains no images.
    """
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
                            f"{prompt} Image dimensions: {size_hint} pixels, landscape orientation."
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
