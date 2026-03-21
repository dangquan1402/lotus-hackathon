import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.database import get_db
from app.models.learning import LearningSession
from app.services.chat import get_chat_graph, respond_stream

router = APIRouter(prefix="/chat", tags=["chat"])


class StartChatRequest(BaseModel):
    session_id: int = Field(..., gt=0)


class StartChatResponse(BaseModel):
    thread_id: str
    welcome_message: str


class SendMessageRequest(BaseModel):
    thread_id: str
    message: str = Field(..., min_length=1)


class SendMessageResponse(BaseModel):
    response: str
    sources: list[dict]


# Store session context per thread so /message doesn't need to re-fetch
_thread_contexts: dict[str, dict] = {}


@router.post("/start", response_model=StartChatResponse)
async def start_chat(
    payload: StartChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a chat session for a learning session."""
    result = await db.execute(
        select(LearningSession).where(LearningSession.id == payload.session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Learning session not found")

    # Build session context
    search_results = session.search_results or []
    session_context = {
        "topic": session.topic,
        "generated_content": session.generated_content or {},
        "search_results": search_results,
    }

    thread_id = str(uuid.uuid4())
    _thread_contexts[thread_id] = session_context

    # Generate welcome message by invoking the graph with an initial user message
    graph = get_chat_graph()
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Hi! I'm studying {session.topic}. "
                    "Give me a brief welcome and ask how you can help me with this topic."
                ),
            }
        ],
        "session_context": session_context,
    }

    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: graph.invoke(initial_state, config)
    )

    welcome = result["messages"][-1]
    welcome_content = welcome.content if hasattr(welcome, "content") else welcome.get("content", "")

    return StartChatResponse(
        thread_id=thread_id,
        welcome_message=welcome_content,
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(payload: SendMessageRequest):
    """Send a message in an existing chat thread."""
    session_context = _thread_contexts.get(payload.thread_id)
    if session_context is None:
        raise HTTPException(status_code=404, detail="Chat thread not found")

    graph = get_chat_graph()
    config = {"configurable": {"thread_id": payload.thread_id}}

    # The graph's checkpointer already has prior messages for this thread.
    # We just need to add the new user message.
    input_state = {
        "messages": [{"role": "user", "content": payload.message}],
        "session_context": session_context,
    }

    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: graph.invoke(input_state, config)
    )

    ai_message = result["messages"][-1]
    ai_content = (
        ai_message.content if hasattr(ai_message, "content") else ai_message.get("content", "")
    )

    # Extract sources from session context for the response
    sources = [
        {"url": r.get("url", ""), "title": r.get("title", "")}
        for r in session_context.get("search_results", [])
        if r.get("url") and r.get("title")
    ]

    return SendMessageResponse(
        response=ai_content,
        sources=sources,
    )


@router.post("/message/stream")
async def send_message_stream(payload: SendMessageRequest):
    """Stream a response in an existing chat thread via Server-Sent Events."""
    session_context = _thread_contexts.get(payload.thread_id)
    if session_context is None:
        raise HTTPException(status_code=404, detail="Chat thread not found")

    graph = get_chat_graph()
    config = {"configurable": {"thread_id": payload.thread_id}}

    # Get current state from the graph checkpointer to build full message history
    current_state = await asyncio.get_event_loop().run_in_executor(
        None, lambda: graph.get_state(config)
    )
    prior_messages = current_state.values.get("messages", []) if current_state.values else []

    # Build state with full history + new user message
    stream_state = {
        "messages": list(prior_messages) + [{"role": "user", "content": payload.message}],
        "session_context": session_context,
    }

    sources = [
        {"url": r.get("url", ""), "title": r.get("title", "")}
        for r in session_context.get("search_results", [])
        if r.get("url") and r.get("title")
    ]

    async def event_generator():
        full_response = []
        try:
            async for chunk in respond_stream(stream_state):
                full_response.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"

        # Save the full response to the LangGraph checkpointer for conversation history
        assembled = "".join(full_response)

        # Update the graph state directly with user + assistant messages
        def _save_to_graph():
            graph.update_state(
                config,
                {
                    "messages": [
                        {"role": "user", "content": payload.message},
                        {"role": "assistant", "content": assembled},
                    ],
                },
            )

        await asyncio.get_event_loop().run_in_executor(None, _save_to_graph)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
