import json
import re
from pathlib import Path

import httpx

from app.schemas.learning import GeneratedContent

CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODEL = "gemini-2.5-flash"


def _load_fuseapi_config() -> tuple[str, str]:
    """Load FuseAPI endpoint and API key from ~/.fuseapi/config.json."""
    config = json.loads(CONFIG_PATH.read_text())
    profile = config["profiles"][config["default"]]
    endpoint = profile["endpoint"]
    # Ensure protocol separator has double slashes
    endpoint = re.sub(r"^(https?):(?!//)", r"\1://", endpoint)
    return endpoint, profile["apiKey"]


def _build_system_prompt(
    learning_style: str,
    expertise_level: str,
    perspective: str | None,
    interests: list[str],
) -> str:
    """Build the system prompt tailored to the user's profile."""
    style_guidance = {
        "visual": (
            "Use vivid descriptions, metaphors, and suggest diagrams or charts wherever possible."
        ),
        "auditory": "Use conversational language, rhythm, and narrative storytelling.",
        "reading": "Provide detailed textual explanations with clear structure and references.",
        "kinesthetic": (
            "Use hands-on examples, step-by-step processes, and real-world applications."
        ),
    }
    level_guidance = {
        "beginner": (
            "Explain concepts from scratch. Avoid jargon; define any technical terms you use."
        ),
        "intermediate": (
            "Assume foundational knowledge. Build on basics and introduce moderate complexity."
        ),
        "advanced": (
            "Assume strong prior knowledge. Dive deep, use precise terminology,"
            " and highlight nuances."
        ),
    }

    intro = (
        "You are an expert educational content creator. Your task is to synthesize web research"
        " into engaging, personalized learning content."
    )
    parts = [
        intro,
        f"Learning style: {learning_style}. {style_guidance.get(learning_style, '')}",
        f"Expertise level: {expertise_level}. {level_guidance.get(expertise_level, '')}",
    ]
    if perspective:
        parts.append(f"User perspective/role: {perspective}. Tailor examples to this context.")
    if interests:
        interests_str = ", ".join(interests)
        parts.append(f"User interests: {interests_str}. Connect content to these when relevant.")

    parts.append(
        "\nYou MUST respond with valid JSON only — no markdown fences, no extra text. "
        "The JSON must match this exact structure:\n"
        "{\n"
        '  "title": "string",\n'
        '  "overview": "string",\n'
        '  "sections": [\n'
        "    {\n"
        '      "title": "string",\n'
        '      "narration_text": "string (200-400 words)",\n'
        '      "image_prompt": "string (detailed visual description for image generation)"\n'
        "    }\n"
        "  ],\n"
        '  "quiz_questions": [\n'
        "    {\n"
        '      "question": "string",\n'
        '      "options": ["string", "string", "string", "string"],\n'
        '      "correct_index": 0,\n'
        '      "explanation": "string"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Generate 4-6 sections and 5 quiz questions."
    )
    return "\n".join(parts)


def _build_user_prompt(topic: str, search_results: list[dict]) -> str:
    """Build the user prompt from topic and search results."""
    sources_text = "\n\n".join(
        f"Source: {r.get('title', 'Unknown')} ({r.get('url', '')})\n{r.get('markdown', '')[:2000]}"
        for r in search_results
    )
    return (
        f"Create a comprehensive learning lesson about: {topic}\n\n"
        f"Use the following web research as your primary source material:\n\n{sources_text}"
    )


async def asynthesize_content(
    topic: str,
    search_results: list[dict],
    learning_style: str,
    expertise_level: str,
    perspective: str | None,
    interests: list[str],
) -> GeneratedContent:
    """Synthesize search results into structured learning content via FuseAPI LLM.

    Args:
        topic: The topic being learned.
        search_results: Raw search results from Firecrawl.
        learning_style: User's preferred learning style.
        expertise_level: User's current expertise level.
        perspective: Optional user role or viewpoint.
        interests: User's topic interests for personalization.

    Returns:
        Structured GeneratedContent validated by Pydantic.

    Raises:
        httpx.HTTPError: On API communication failure.
        ValueError: If the LLM returns malformed JSON.
    """
    endpoint, api_key = _load_fuseapi_config()
    system_prompt = _build_system_prompt(learning_style, expertise_level, perspective, interests)
    user_prompt = _build_user_prompt(topic, search_results)

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{endpoint}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
            },
        )
        response.raise_for_status()

    data = response.json()
    raw_text: str = data["choices"][0]["message"]["content"].strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
        raw_text = re.sub(r"\n?```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM returned invalid JSON: {exc}\nRaw: {raw_text[:500]}") from exc

    return GeneratedContent.model_validate(parsed)
