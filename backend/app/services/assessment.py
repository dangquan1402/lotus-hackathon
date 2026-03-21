import json
import re
from pathlib import Path
from typing import TypedDict

import httpx
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

# Reuse FuseAPI config loading from content.py
CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODELS = ["gemini-3-flash-preview", "claude-sonnet-4-6", "gpt-5.1"]


def _load_config():
    config = json.loads(CONFIG_PATH.read_text())
    profile = config["profiles"][config["default"]]
    endpoint = profile["endpoint"]
    endpoint = re.sub(r"^(https?):(?!//)", r"\1://", endpoint)
    return endpoint, profile["apiKey"]


class AssessmentState(TypedDict):
    topic: str
    search_results: list[dict]
    user_profile: dict  # {interests, learning_style, expertise_level, perspective, age_group, goal}
    learning_history: list[dict]  # [{topic, concepts}]
    questions: list[dict]  # [{id, question, options}] generated questions
    answers: dict  # {question_id: answer} user's answers
    assessment_summary: str  # LLM summary of what user knows/doesn't know


def generate_questions(state: AssessmentState) -> dict:
    """Analyze search results + user profile, generate targeted questions."""
    endpoint, api_key = _load_config()

    search_summary = "\n".join(
        f"- {r.get('title', '')}: {r.get('markdown', '')[:300]}"
        for r in state["search_results"][:5]
    )

    history_text = ""
    if state["learning_history"]:
        history_text = "\nUser previously learned:\n" + "\n".join(
            f"- {h['topic']}: {', '.join(h.get('concepts', [])[:5])}"
            for h in state["learning_history"][:5]
        )

    profile = state["user_profile"]

    topic_name = state["topic"]
    prompt = f"""You are a learning assessment expert. \
A student wants to learn about "{topic_name}".

Student profile:
- Expertise: {profile.get("expertise_level", "beginner")}
- Age group: {profile.get("age_group", "secondary")}
- Interests: {", ".join(profile.get("interests", []))}
- Goal: {profile.get("goal", "curiosity")}
{history_text}

Web research found these topics:
{search_summary}

Generate 3-4 targeted questions to understand what the student already knows about this topic.
Each question should help determine:
1. What prerequisites they already understand
2. What specific aspect interests them most
3. What depth level is appropriate

Respond with ONLY valid JSON (no markdown fences):
{{
  "questions": [
    {{
      "id": "q1",
      "question": "...",
      "type": "multiple_choice",
      "options": ["option1", "option2", "option3"],
      "purpose": "why this question helps personalization"
    }}
  ]
}}

Mix question types: some multiple choice, some with options like "Yes / Somewhat / No", \
and one open-ended about what specifically interests them."""

    import time

    resp = None
    for model in MODELS:
        for attempt in range(2):
            resp = httpx.post(
                f"{endpoint}/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
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

    raw = resp.json()["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)
    return {"questions": data["questions"]}


def collect_answers(state: AssessmentState) -> dict:
    """Interrupt to collect user answers. Returns when user resumes."""
    # This pauses execution and sends questions to the frontend
    user_answers = interrupt(
        {
            "type": "assessment_questions",
            "questions": state["questions"],
        }
    )
    return {"answers": user_answers}


def summarize_assessment(state: AssessmentState) -> dict:
    """Summarize what the user knows/doesn't know based on their answers."""
    endpoint, api_key = _load_config()

    qa_text = ""
    for q in state["questions"]:
        answer = state["answers"].get(q["id"], "no answer")
        qa_text += f"\nQ: {q['question']}\nA: {answer}\n"

    prompt = f"""Based on this pre-assessment for learning "{state["topic"]}":

{qa_text}

Write a brief summary (2-3 sentences) of:
1. What the student already knows
2. What they need to learn
3. What angle/approach would work best for them

This summary will be used to personalize their lesson content. Be specific and actionable."""

    import time

    resp = None
    for model in MODELS:
        resp = httpx.post(
            f"{endpoint}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
            },
            timeout=60,
        )
        if resp.status_code == 200:
            break
        time.sleep(2)
    resp.raise_for_status()

    summary = resp.json()["choices"][0]["message"]["content"].strip()
    return {"assessment_summary": summary}


# Build the graph
def build_assessment_graph():
    builder = StateGraph(AssessmentState)
    builder.add_node("generate_questions", generate_questions)
    builder.add_node("collect_answers", collect_answers)
    builder.add_node("summarize", summarize_assessment)

    builder.add_edge(START, "generate_questions")
    builder.add_edge("generate_questions", "collect_answers")
    builder.add_edge("collect_answers", "summarize")
    builder.add_edge("summarize", END)

    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)


# Singleton graph instance
_graph = None


def get_assessment_graph():
    global _graph
    if _graph is None:
        _graph = build_assessment_graph()
    return _graph
