import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from langgraph.types import Command
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.learning import LearningSession
from app.models.user import User
from app.services.assessment import get_assessment_graph
from app.services.search import search_topic

router = APIRouter(prefix="/assessment", tags=["assessment"])


class StartAssessmentRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    topic: str = Field(..., min_length=1, max_length=500)


class StartAssessmentResponse(BaseModel):
    thread_id: str
    questions: list[dict]


class SubmitAnswersRequest(BaseModel):
    thread_id: str
    answers: dict  # {question_id: answer_value}


class SubmitAnswersResponse(BaseModel):
    assessment_summary: str
    session_id: int


@router.post("/start", response_model=StartAssessmentResponse)
async def start_assessment(
    payload: StartAssessmentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start pre-assessment: search topic, generate targeted questions."""
    # Fetch user
    result = await db.execute(select(User).where(User.id == payload.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Search web
    search_results = await search_topic(payload.topic, user.interests or [])

    # Fetch learning history
    history_result = await db.execute(
        select(LearningSession.topic, LearningSession.concepts_learned)
        .where(LearningSession.user_id == user.id)
        .where(LearningSession.status != "error")
        .order_by(LearningSession.created_at.desc())
        .limit(5)
    )
    learning_history = [
        {"topic": r.topic, "concepts": r.concepts_learned or []} for r in history_result.all()
    ]

    # Build initial state
    thread_id = str(uuid.uuid4())

    initial_state = {
        "topic": payload.topic,
        "search_results": search_results,
        "user_profile": {
            "interests": user.interests or [],
            "learning_style": user.learning_style,
            "expertise_level": user.expertise_level,
            "perspective": user.perspective,
            "age_group": getattr(user, "age_group", None),
            "goal": getattr(user, "goal", None),
        },
        "learning_history": learning_history,
        "questions": [],
        "answers": {},
        "assessment_summary": "",
    }

    graph = get_assessment_graph()
    config = {"configurable": {"thread_id": thread_id}}

    # Run graph — will pause at collect_answers interrupt
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: graph.invoke(initial_state, config)
    )

    # Extract questions from the interrupt
    interrupt_data = result.get("__interrupt__", [])
    if interrupt_data:
        questions = interrupt_data[0].value.get("questions", [])
    else:
        questions = result.get("questions", [])

    return StartAssessmentResponse(
        thread_id=thread_id,
        questions=questions,
    )


@router.post("/submit", response_model=SubmitAnswersResponse)
async def submit_answers(
    payload: SubmitAnswersRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit answers and get personalized assessment summary."""
    graph = get_assessment_graph()
    config = {"configurable": {"thread_id": payload.thread_id}}

    # Resume with answers
    result = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: graph.invoke(Command(resume=payload.answers), config),
    )

    assessment_summary = result.get("assessment_summary", "")
    topic = result.get("topic", "")
    search_results = result.get("search_results", [])
    user_profile = result.get("user_profile", {})

    # Determine user_id from the graph state user_profile
    # Fall back to looking up by thread state
    user_id = user_profile.get("user_id", 1)

    # Now create the learning session with the assessment context
    session = LearningSession(
        user_id=user_id,
        topic=topic,
        status="assessed",
        search_results=search_results,
        assessment_summary=assessment_summary,
        assessment_qa={
            "questions": result.get("questions", []),
            "answers": result.get("answers", {}),
        },
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    return SubmitAnswersResponse(
        assessment_summary=assessment_summary,
        session_id=session.id,
    )
