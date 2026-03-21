import json
import re
import time
from pathlib import Path
from typing import Annotated, TypedDict

import httpx
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODELS = ["gpt-5.1"]


def _load_config():
    config = json.loads(CONFIG_PATH.read_text())
    profile = config["profiles"][config["default"]]
    endpoint = profile["endpoint"]
    endpoint = re.sub(r"^(https?):(?!//)", r"\1://", endpoint)
    return endpoint, profile["apiKey"]


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
    endpoint, api_key = _load_config()

    system_prompt = _build_system_prompt(state["session_context"])

    # Build messages list: system + conversation history
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in state["messages"]:
        # LangGraph uses HumanMessage/AIMessage objects with .type and .content
        if hasattr(msg, "type"):
            role = msg.type
            content = msg.content
        else:
            role = msg.get("role", "user")
            content = msg.get("content", "")
        # Map LangGraph types to OpenAI roles
        if role == "human":
            role = "user"
        elif role == "ai":
            role = "assistant"
        api_messages.append({"role": role, "content": content})

    resp = None
    for model in MODELS:
        for attempt in range(2):
            resp = httpx.post(
                f"{endpoint}/v1/chat/completions",
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
        if resp.status_code == 200:
            break
    resp.raise_for_status()

    ai_content = resp.json()["choices"][0]["message"]["content"].strip()
    return {"messages": [{"role": "assistant", "content": ai_content}]}


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
