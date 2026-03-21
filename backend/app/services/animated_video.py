"""Generate animated video clips from static images using Grok Imagine API.

Uses batch video generation for parallel processing.
Flow: upload all images → batch generate videos → download clips.
"""

import asyncio
import json
import os
from pathlib import Path

import httpx

GROK_API = os.environ.get("GROK_API_URL", "http://host.docker.internal:8420")


async def upload_image(image_path: Path) -> tuple[str, str]:
    """Upload an image to Grok and return (post_id, image_stem)."""
    async with httpx.AsyncClient(timeout=120) as client:
        with open(image_path, "rb") as f:
            resp = await client.post(
                f"{GROK_API}/api/upload-image",
                files={"file": (image_path.name, f, "image/jpeg")},
            )
        resp.raise_for_status()
        return resp.json()["post_id"], image_path.stem


async def generate_animated_clips(
    image_paths: list[str],
    output_dir: Path,
) -> list[str]:
    """Generate animated clips for all images using batch API.

    1. Upload all images in parallel
    2. Call batch video generation endpoint
    3. Download all resulting clips

    Args:
        image_paths: List of image paths (e.g. 'output/session_5/images/scene_00_00.jpg').
        output_dir: Base output directory for the session.

    Returns:
        List of output clip paths.
    """
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    # Filter to existing images and skip already-generated clips
    to_process: list[tuple[Path, str]] = []  # (image_path, clip_name)
    results: list[str] = []

    for img_path_str in image_paths:
        img_path = Path(img_path_str)
        if not img_path.exists():
            continue
        clip_name = img_path.stem + ".mp4"
        clip_path = clips_dir / clip_name
        if clip_path.exists():
            results.append(str(clip_path))
        else:
            to_process.append((img_path, clip_name))

    if not to_process:
        return results

    # Step 1: Upload all images in parallel
    upload_tasks = [upload_image(img) for img, _ in to_process]
    upload_results = await asyncio.gather(*upload_tasks, return_exceptions=True)

    # Map post_id -> clip_name for download later
    post_id_to_clip: dict[str, str] = {}
    image_ids: list[str] = []

    for i, result in enumerate(upload_results):
        if isinstance(result, Exception):
            print(f"Upload failed for {to_process[i][0]}: {result}")
            continue
        post_id, _ = result
        clip_name = to_process[i][1]
        post_id_to_clip[post_id] = clip_name
        image_ids.append(post_id)

    if not image_ids:
        return results

    # Step 2: Batch generate videos (streaming NDJSON response)
    async with httpx.AsyncClient(timeout=600) as client:
        async with client.stream(
            "POST",
            f"{GROK_API}/api/generate-videos-batch",
            json={
                "image_ids": image_ids,
                "duration": 6,
                "resolution": "480p",
                "max_parallel": 3,
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue

                img_id = item.get("image_id", "")
                video_url = item.get("video_url")
                status = item.get("status")

                if status != "completed" or not video_url:
                    err = item.get("error", "unknown error")
                    print(f"Video failed for {img_id}: {err}")
                    continue

                clip_name = post_id_to_clip.get(img_id)
                if not clip_name:
                    continue

                # Step 3: Download the clip
                clip_path = clips_dir / clip_name
                try:
                    dl = await client.get(f"{GROK_API}{video_url}")
                    dl.raise_for_status()
                    clip_path.write_bytes(dl.content)
                    results.append(str(clip_path))
                    print(f"Saved clip: {clip_path}")
                except Exception as exc:
                    print(f"Download failed for {clip_name}: {exc}")

    return results
