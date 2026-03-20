from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.models.user import User
from app.schemas.learning import TopicExploreRequest, TopicExploreResponse
from app.services.content import asynthesize_content
from app.services.search import search_topic

router = APIRouter(prefix="/topics", tags=["topics"])


@router.post("/explore", response_model=TopicExploreResponse, status_code=status.HTTP_201_CREATED)
async def explore_topic(
    payload: TopicExploreRequest,
    db: AsyncSession = Depends(get_db),
) -> TopicExploreResponse:
    """Explore a learning topic personalized to the user.

    Fetches user profile, searches the web via Firecrawl, synthesizes structured
    learning content via the LLM, persists a LearningSession, and returns the result.

    Args:
        payload: Contains user_id and topic string.
        db: Async database session.

    Returns:
        TopicExploreResponse with session_id and generated content.

    Raises:
        HTTPException 404: If the user does not exist.
        HTTPException 502: If search or content generation fails.
    """
    # Fetch user
    result = await db.execute(select(User).where(User.id == payload.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Create session in searching state
    session = LearningSession(
        user_id=user.id,
        topic=payload.topic,
        status="searching",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    try:
        # Search web
        search_results = await search_topic(payload.topic, user.interests or [])
        session.search_results = search_results
        session.status = "generating"
        await db.flush()

        # Synthesize content
        generated = await asynthesize_content(
            topic=payload.topic,
            search_results=search_results,
            learning_style=user.learning_style,
            expertise_level=user.expertise_level,
            perspective=user.perspective,
            interests=user.interests or [],
        )

        session.generated_content = generated.model_dump()
        session.status = "complete"
        session.updated_at = datetime.now(UTC)
        await db.flush()
        await db.refresh(session)

    except Exception as exc:
        session.status = "error"
        session.updated_at = datetime.now(UTC)
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Content generation failed: {exc}",
        ) from exc

    return TopicExploreResponse(
        session_id=session.id,
        user_id=session.user_id,
        topic=session.topic,
        status=session.status,
        generated_content=generated,
        created_at=session.created_at,
    )
