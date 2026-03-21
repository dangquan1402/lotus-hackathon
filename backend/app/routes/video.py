import asyncio
import traceback
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.schemas.learning import (
    GenerateImagesResponse,
    GenerateSectionAudioRequest,
    GenerateSectionAudioResponse,
    GenerateVideoRequest,
    GenerateVideoResponse,
    GenerateVoiceResponse,
    SessionIdRequest,
)
from app.services.image_gen import agenerate_image
from app.services.video_gen import agenerate_video
from app.services.voice_gen import aalign_audio, agenerate_voice

router = APIRouter(prefix="/video", tags=["video"])

# Styles that look better with animated video clips
ANIMATED_STYLES = {"photorealistic", "3d_render", "anime", "cartoon"}
# Styles that work better as static images (diagrams, flat art)
STATIC_STYLES = {"scientific", "minimalist", "watercolor"}


def _resolve_animated(use_animated: bool | None, image_style: str | None) -> bool:
    """Resolve use_animated flag: explicit override > style-based > default."""
    if use_animated is not None:
        return use_animated
    return (image_style or "").lower() in ANIMATED_STYLES


async def _get_session(session_id: int, db: AsyncSession) -> LearningSession:
    result = await db.execute(select(LearningSession).where(LearningSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not session.generated_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session content is not ready.",
        )
    return session


@router.post("/generate-images", response_model=GenerateImagesResponse)
async def generate_images(
    payload: SessionIdRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateImagesResponse:
    """Generate images for each content section."""
    session = await _get_session(payload.session_id, db)
    content = session.generated_content
    images_dir = Path(session.output_dir) / "images"

    try:
        session.status = "images_generating"
        await db.flush()

        image_style = session.image_style
        image_provider = session.image_provider or "fuseapi"
        image_tasks = []
        for i, section in enumerate(content.get("sections", [])):
            prompts = section.get("image_prompts") or [section.get("image_prompt", "")]
            for j, prompt in enumerate(prompts):
                if prompt:
                    image_tasks.append(
                        agenerate_image(
                            prompt=prompt,
                            output_path=images_dir / f"scene_{i:02d}_{j:02d}.jpg",
                            style=image_style,
                            provider=image_provider,
                        )
                    )
        image_results = await asyncio.gather(*image_tasks)
        session.image_paths = [str(p) for p in image_results]
        session.status = "images_done"
        await db.flush()

    except Exception as exc:
        traceback.print_exc()
        session.status = "error"
        session.error_message = str(exc)[:2000]
        await db.flush()
        raise HTTPException(status_code=502, detail=f"Image generation failed: {exc}") from exc

    return GenerateImagesResponse(
        session_id=session.id,
        status="images_done",
        image_paths=[str(p) for p in image_results],
        message=f"Generated {len(image_results)} images",
    )


@router.post("/generate-voice", response_model=GenerateVoiceResponse)
async def generate_voice(
    payload: SessionIdRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateVoiceResponse:
    """Generate narration audio and word-level alignment."""
    session = await _get_session(payload.session_id, db)
    content = session.generated_content
    audio_path = Path(session.output_dir) / "narration.wav"

    try:
        session.status = "audio_generating"
        await db.flush()

        sections_list = content.get("sections", [])
        full_narration = " ".join(
            section["narration_text"] for section in sections_list
        )
        await agenerate_voice(full_narration, audio_path)
        session.audio_path = str(audio_path)

        # Per-section audio for playbook mode
        section_audio_dir = Path(session.output_dir) / "audio"
        section_audio_tasks = []
        for idx, section in enumerate(sections_list):
            section_audio_tasks.append(
                agenerate_voice(
                    section["narration_text"],
                    section_audio_dir / f"section_{idx}.wav",
                )
            )
        await asyncio.gather(*section_audio_tasks)

        session.status = "audio_done"
        await db.flush()

        # Align audio for word-level captions
        session.status = "aligning"
        await db.flush()

        alignment = await aalign_audio(audio_path)
        session.alignment = alignment
        session.status = "aligned"
        await db.flush()

    except Exception as exc:
        traceback.print_exc()
        session.status = "error"
        session.error_message = str(exc)[:2000]
        await db.flush()
        raise HTTPException(status_code=502, detail=f"Voice generation failed: {exc}") from exc

    return GenerateVoiceResponse(
        session_id=session.id,
        status="aligned",
        audio_path=str(audio_path),
        message="Voice generated and aligned",
    )


@router.post("/generate-video", response_model=GenerateVideoResponse)
async def generate_video(
    payload: GenerateVideoRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateVideoResponse:
    """Render video via Remotion. Requires images and audio to be generated first."""
    session = await _get_session(payload.session_id, db)

    if not session.image_paths:
        raise HTTPException(
            status_code=400, detail="Images not generated. Call /generate-images first."
        )
    if not session.audio_path:
        raise HTTPException(
            status_code=400, detail="Audio not generated. Call /generate-voice first."
        )

    content = session.generated_content
    session_dir = Path(session.output_dir)

    try:
        session.status = "video_rendering"
        await db.flush()

        animated = _resolve_animated(payload.use_animated, session.image_style)
        video_path = await agenerate_video(
            session_id=session.id,
            content=content,
            images_dir=session_dir / "images",
            audio_path=Path(session.audio_path),
            output_dir=session_dir / "video",
            alignment=session.alignment,
            use_animated=animated,
        )
        session.video_path = str(video_path)
        session.status = "video_done"
        await db.flush()

    except Exception as exc:
        traceback.print_exc()
        session.status = "error"
        session.error_message = str(exc)[:2000]
        await db.flush()
        raise HTTPException(status_code=502, detail=f"Video render failed: {exc}") from exc

    return GenerateVideoResponse(
        session_id=session.id,
        status="video_done",
        video_path=str(video_path),
        video_url=f"/api/files/session_{session.id}/video/lesson_{session.id}.mp4",
        message="Video rendered successfully",
    )


@router.post("/generate-all", response_model=GenerateVideoResponse)
async def generate_all(
    payload: GenerateVideoRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateVideoResponse:
    """Run full pipeline: images → voice → align → render. Convenience endpoint."""
    session = await _get_session(payload.session_id, db)
    content = session.generated_content
    session_dir = Path(session.output_dir)
    images_dir = session_dir / "images"
    audio_path = session_dir / "narration.wav"

    try:
        # Images
        session.status = "images_generating"
        await db.flush()
        image_style = session.image_style
        image_provider = session.image_provider or "fuseapi"
        image_tasks = []
        for i, section in enumerate(content.get("sections", [])):
            prompts = section.get("image_prompts") or [section.get("image_prompt", "")]
            for j, prompt in enumerate(prompts):
                if prompt:
                    image_tasks.append(
                        agenerate_image(
                            prompt=prompt,
                            output_path=images_dir / f"scene_{i:02d}_{j:02d}.jpg",
                            style=image_style,
                            provider=image_provider,
                        )
                    )
        image_results = await asyncio.gather(*image_tasks)
        session.image_paths = [str(p) for p in image_results]
        session.status = "images_done"
        await db.flush()

        # Voice + alignment
        session.status = "audio_generating"
        await db.flush()
        sections_list = content.get("sections", [])
        full_narration = " ".join(
            section["narration_text"] for section in sections_list
        )
        await agenerate_voice(full_narration, audio_path)
        session.audio_path = str(audio_path)

        # Per-section audio for playbook mode
        section_audio_dir = session_dir / "audio"
        section_audio_tasks = []
        for idx, section in enumerate(sections_list):
            section_audio_tasks.append(
                agenerate_voice(
                    section["narration_text"],
                    section_audio_dir / f"section_{idx}.wav",
                )
            )
        await asyncio.gather(*section_audio_tasks)

        session.status = "audio_done"
        await db.flush()

        alignment = await aalign_audio(audio_path)
        session.alignment = alignment
        await db.flush()

        # Render
        session.status = "video_rendering"
        await db.flush()
        animated = _resolve_animated(payload.use_animated, session.image_style)
        video_path = await agenerate_video(
            session_id=session.id,
            content=content,
            images_dir=images_dir,
            audio_path=audio_path,
            output_dir=session_dir / "video",
            alignment=alignment,
            use_animated=animated,
        )
        session.video_path = str(video_path)
        session.status = "video_done"
        await db.flush()

    except Exception as exc:
        traceback.print_exc()
        session.status = "error"
        session.error_message = str(exc)[:2000]
        await db.flush()
        raise HTTPException(status_code=502, detail=f"Pipeline failed: {exc}") from exc

    return GenerateVideoResponse(
        session_id=session.id,
        status="video_done",
        video_path=str(video_path),
        video_url=f"/api/files/session_{session.id}/video/lesson_{session.id}.mp4",
        message="Full pipeline complete",
    )


@router.post("/generate-section-audio", response_model=GenerateSectionAudioResponse)
async def generate_section_audio(
    payload: GenerateSectionAudioRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateSectionAudioResponse:
    """Generate audio for a single section's narration text."""
    session = await _get_session(payload.session_id, db)
    audio_dir = Path(session.output_dir) / "audio"
    output_path = audio_dir / f"section_{payload.section_index}.wav"

    try:
        await agenerate_voice(payload.text, output_path)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=502, detail=f"Section audio generation failed: {exc}"
        ) from exc

    audio_url = f"/api/files/session_{session.id}/audio/section_{payload.section_index}.wav"
    return GenerateSectionAudioResponse(audio_url=audio_url)


@router.post("/generate-animated-clips")
async def generate_animated_clips_endpoint(
    payload: SessionIdRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate animated video clips from session images using Grok Imagine API."""
    from app.services.animated_video import generate_animated_clips

    session = await _get_session(payload.session_id, db)
    if not session.image_paths:
        raise HTTPException(
            status_code=400, detail="No images. Run image generation first."
        )

    session_dir = Path(session.output_dir)

    try:
        clip_paths = await generate_animated_clips(
            image_paths=session.image_paths,
            output_dir=session_dir,
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=502, detail=f"Clip generation failed: {exc}"
        ) from exc

    clip_urls = [
        f"/api/files/{p.replace('output/', '')}" for p in clip_paths
    ]

    return {
        "session_id": session.id,
        "clips": clip_urls,
        "count": len(clip_urls),
        "message": f"Generated {len(clip_urls)} animated clips",
    }
