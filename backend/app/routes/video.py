import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.schemas.learning import GenerateVideoRequest, GenerateVideoResponse
from app.services.image_gen import agenerate_image
from app.services.video_gen import agenerate_video
from app.services.voice_gen import agenerate_voice

router = APIRouter(prefix="/video", tags=["video"])

OUTPUT_DIR = Path("output")


@router.post("/generate", response_model=GenerateVideoResponse)
async def generate_video(
    payload: GenerateVideoRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateVideoResponse:
    """Generate a video lesson for a completed learning session.

    Generates one image per content section in parallel, synthesizes a voice
    narration, then renders the final video via Remotion.

    Args:
        payload: Contains session_id.
        db: Async database session.

    Returns:
        GenerateVideoResponse with video path and URL.

    Raises:
        HTTPException 404: If session does not exist.
        HTTPException 400: If session content is not ready.
        HTTPException 502: If any generation step fails.
    """
    result = await db.execute(
        select(LearningSession).where(LearningSession.id == payload.session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status != "complete" or not session.generated_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session content is not ready. Status must be 'complete'.",
        )

    content = session.generated_content
    session_output_dir = OUTPUT_DIR / f"session_{session.id}"
    images_dir = session_output_dir / "images"
    audio_path = session_output_dir / "narration.wav"
    video_output_dir = session_output_dir / "video"

    try:
        # Generate images for each section in parallel
        image_tasks = [
            agenerate_image(
                prompt=section["image_prompt"],
                output_path=images_dir / f"scene_{str(i).zfill(2)}.jpg",
            )
            for i, section in enumerate(content.get("sections", []))
        ]
        await asyncio.gather(*image_tasks)

        # Generate combined narration from all sections
        full_narration = " ".join(
            section["narration_text"] for section in content.get("sections", [])
        )
        await agenerate_voice(full_narration, audio_path)

        # Render video
        video_path = await agenerate_video(
            session_id=session.id,
            content=content,
            images_dir=images_dir,
            audio_path=audio_path,
            output_dir=video_output_dir,
        )

        relative_path = str(video_path)
        session.video_path = relative_path
        await db.flush()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Video generation failed: {exc}",
        ) from exc

    video_filename = video_path.name
    return GenerateVideoResponse(
        session_id=session.id,
        status="complete",
        video_path=relative_path,
        video_url=f"/api/files/session_{session.id}/video/{video_filename}",
        message="Video generated successfully",
    )
