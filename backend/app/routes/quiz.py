from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.schemas.learning import QuizSubmitRequest, QuizSubmitResponse
from app.services.quiz_gen import aget_quiz, score_quiz

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/{session_id}", response_model=list[dict])
async def get_quiz(
    session_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the quiz questions for a completed learning session.

    Correct answer indices are intentionally included so the frontend can
    provide immediate feedback after submission.

    Args:
        session_id: Primary key of the learning session.
        db: Async database session.

    Returns:
        List of quiz question dicts.

    Raises:
        HTTPException 404: If session does not exist.
        HTTPException 400: If session has no generated content.
    """
    result = await db.execute(select(LearningSession).where(LearningSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if not session.generated_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No generated content found for this session.",
        )

    questions = await aget_quiz(session.generated_content)
    return questions


@router.post("/{session_id}/submit", response_model=QuizSubmitResponse)
async def submit_quiz(
    session_id: int,
    payload: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> QuizSubmitResponse:
    """Submit quiz answers and receive a scored result.

    Args:
        session_id: Primary key of the learning session.
        payload: Contains list of submitted answer indices.
        db: Async database session.

    Returns:
        QuizSubmitResponse with total, correct count, percentage score, and per-question results.

    Raises:
        HTTPException 404: If session does not exist.
        HTTPException 400: If session has no generated content or answer count mismatches.
    """
    result = await db.execute(select(LearningSession).where(LearningSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if not session.generated_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No generated content found for this session.",
        )

    questions = await aget_quiz(session.generated_content)
    if len(payload.answers) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Answer count mismatch: expected {len(questions)}, got {len(payload.answers)}."
            ),
        )

    scored = score_quiz(questions, payload.answers)
    return QuizSubmitResponse(
        session_id=session_id,
        total=scored["total"],
        correct=scored["correct"],
        score=scored["score"],
        results=scored["results"],
    )
