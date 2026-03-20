from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.schemas.learning import GenerateSlidesRequest, GenerateSlidesResponse
from app.services.slide_gen import agenerate_slides

router = APIRouter(prefix="/slides", tags=["slides"])

OUTPUT_DIR = Path("output")


@router.post("/generate", response_model=GenerateSlidesResponse)
async def generate_slides(
    payload: GenerateSlidesRequest,
    db: AsyncSession = Depends(get_db),
) -> GenerateSlidesResponse:
    """Generate a PPTX slideshow for a completed learning session.

    Uses any section images previously generated for the session (from a prior
    video generation call). Images are optional; slides are created regardless.

    Args:
        payload: Contains session_id.
        db: Async database session.

    Returns:
        GenerateSlidesResponse with slides path and URL.

    Raises:
        HTTPException 404: If session does not exist.
        HTTPException 400: If session content is not ready.
        HTTPException 502: If slide generation fails.
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
    slides_output_dir = session_output_dir / "slides"

    try:
        slides_path = await agenerate_slides(
            session_id=session.id,
            content=content,
            images_dir=images_dir,
            output_dir=slides_output_dir,
        )

        relative_path = str(slides_path)
        session.slides_path = relative_path
        await db.flush()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Slide generation failed: {exc}",
        ) from exc

    slides_filename = slides_path.name
    return GenerateSlidesResponse(
        session_id=session.id,
        status="complete",
        slides_path=relative_path,
        slides_url=f"/api/files/session_{session.id}/slides/{slides_filename}",
        message="Slides generated successfully",
    )
