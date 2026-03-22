import asyncio
import json
import time
from collections.abc import AsyncGenerator
from typing import Annotated, TypedDict

import httpx
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app.services.llm import get_llm_config


class ChatState(TypedDict):
    messages: Annotated[list[dict], add_messages]
    session_context: dict  # {topic, generated_content, search_results}


SYSTEM_PROMPT_TEMPLATE = """You are a helpful tutor for the topic: "{topic}".

Use the lesson content and sources below to answer the student's questions.
Cite sources as [Source: title](url) when relevant. Keep answers concise and educational.

## Lesson Content
{lesson_content}

## Sources
{sources}
"""


def _build_system_prompt(session_context: dict) -> str:
    topic = session_context.get("topic", "")

    # Format lesson content from generated_content sections
    generated = session_context.get("generated_content", {})
    sections = generated.get("sections", []) if generated else []
    lesson_parts = []
    for s in sections:
        title = s.get("title", "")
        narration = s.get("narration_text", "")
        if title or narration:
            lesson_parts.append(f"### {title}\n{narration}")
    lesson_content = "\n\n".join(lesson_parts) if lesson_parts else "No lesson content available."

    # Format search results as sources
    search_results = session_context.get("search_results", []) or []
    source_lines = []
    for r in search_results:
        url = r.get("url", "")
        title = r.get("title", "")
        if url and title:
            source_lines.append(f"- [{title}]({url})")
    sources = "\n".join(source_lines) if source_lines else "No sources available."

    return SYSTEM_PROMPT_TEMPLATE.format(
        topic=topic,
        lesson_content=lesson_content,
        sources=sources,
    )


def respond(state: ChatState) -> dict:
    """Call the LLM with session context and message history."""
    base_url, api_key, model = get_llm_config()
    api_messages = _build_api_messages(state)

    resp = None
    for attempt in range(2):
        resp = httpx.post(
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": api_messages,
                "temperature": 0.7,
            },
            timeout=120,
        )
        if resp.status_code in (429, 529) and attempt < 1:
            time.sleep(3)
            continue
        break
    resp.raise_for_status()

    ai_content = resp.json()["choices"][0]["message"]["content"].strip()
    return {"messages": [{"role": "assistant", "content": ai_content}]}


def _build_api_messages(state: ChatState) -> list[dict]:
    """Build the API messages list from state (shared by respond and respond_stream)."""
    system_prompt = _build_system_prompt(state["session_context"])
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in state["messages"]:
        if hasattr(msg, "type"):
            role = msg.type
            content = msg.content
        else:
            role = msg.get("role", "user")
            content = msg.get("content", "")
        if role == "human":
            role = "user"
        elif role == "ai":
            role = "assistant"
        api_messages.append({"role": role, "content": content})
    return api_messages


async def respond_stream(
    state: ChatState,
) -> AsyncGenerator[str, None]:
    """Stream LLM response chunks. Yields content strings."""
    base_url, api_key, model = get_llm_config()
    api_messages = _build_api_messages(state)

    async with httpx.AsyncClient(timeout=120) as client:
        for attempt in range(2):
            async with client.stream(
                "POST",
                f"{base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": api_messages,
                    "temperature": 0.7,
                    "stream": True,
                },
            ) as resp:
                if resp.status_code in (429, 529) and attempt < 1:
                    await resp.aread()
                    await asyncio.sleep(3)
                    continue
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        return
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content")
                    if content:
                        yield content
                return  # success


def build_chat_graph():
    builder = StateGraph(ChatState)
    builder.add_node("respond", respond)
    builder.add_edge(START, "respond")
    builder.add_edge("respond", END)

    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)


_graph = None


def get_chat_graph():
    global _graph
    if _graph is None:
        _graph = build_chat_graph()
    return _graph
