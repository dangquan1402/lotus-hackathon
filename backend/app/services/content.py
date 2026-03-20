import asyncio
import json
import re
from pathlib import Path

import httpx

from app.schemas.learning import GeneratedContent

CONFIG_PATH = Path.home() / ".fuseapi" / "config.json"
MODEL = "gemini-3-flash-preview"


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
    mode: str = "short",
    learning_history: list[dict] | None = None,
    age_group: str | None = None,
    goal: str | None = None,
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
    if age_group:
        age_guidance = {
            "primary": (
                "The user is a primary school student (ages 6-11). Use very simple language,"
                " fun analogies, and age-appropriate examples."
            ),
            "secondary": (
                "The user is a secondary school student (ages 12-17). Use clear language"
                " with moderate complexity, relatable examples."
            ),
            "adult": (
                "The user is an adult learner. Use professional language"
                " and real-world applications."
            ),
        }
        parts.append(age_guidance.get(age_group, ""))
    if goal:
        goal_guidance = {
            "curiosity": (
                "The user is learning for fun and curiosity. Make it engaging and interesting."
            ),
            "exam_prep": (
                "The user is preparing for an exam. Focus on key concepts, definitions,"
                " and testable knowledge."
            ),
            "homework": (
                "The user needs help with homework. Be clear, structured, and directly helpful."
            ),
            "career": (
                "The user is learning for career development. Include practical applications"
                " and industry context."
            ),
        }
        parts.append(goal_guidance.get(goal, ""))
    if interests:
        interests_str = ", ".join(interests)
        parts.append(f"User interests: {interests_str}. Connect content to these when relevant.")

    # Learning history — reference prior knowledge
    if learning_history:
        history_lines = []
        for session in learning_history[:5]:  # last 5 sessions
            topic = session.get("topic", "")
            concepts = session.get("concepts", [])
            if concepts:
                history_lines.append(f"- {topic}: knows {', '.join(concepts[:8])}")
            else:
                history_lines.append(f"- {topic}")
        parts.append(
            "\nThe user has previously studied these topics:\n"
            + "\n".join(history_lines)
            + "\n\nIMPORTANT: When explaining new concepts, reference their prior "
            "knowledge. If a concept is similar to something they already know, "
            "draw the connection (e.g. 'You learned about X in physics — this is "
            "the same idea applied to Y'). Skip re-explaining concepts they've "
            "already mastered. Build on their existing foundation."
        )

    if mode == "short":
        length_instruction = (
            "\nIMPORTANT: This is for a SHORT video (60-90 seconds). Keep it punchy and concise."
        )
        section_instruction = (
            "Generate EXACTLY 4 sections (total ~200 words narration) and 3 quiz questions. "
            "Each section narration must be 40-60 words — concise, no filler. "
            "Each section must have 2-3 image_prompts describing different visuals."
        )
        narration_hint = "40-60 words, 15-20 seconds spoken"
    else:
        length_instruction = (
            "\nThis is for a DETAILED lesson video (5-8 minutes). Be thorough and educational."
        )
        section_instruction = (
            "Generate 5-6 sections (total ~1000-1500 words narration) and 5 quiz questions. "
            "Each section narration should be 200-300 words — comprehensive and well-explained. "
            "Each section must have 2-3 image_prompts describing different visuals."
        )
        narration_hint = "200-300 words"

    parts.append(
        f"{length_instruction}"
        "\nYou MUST respond with valid JSON only — no markdown fences, no extra text. "
        "The JSON must match this exact structure:\n"
        "{\n"
        '  "title": "string",\n'
        '  "overview": "string",\n'
        '  "sections": [\n'
        "    {\n"
        '      "title": "string",\n'
        f'      "narration_text": "string ({narration_hint})",\n'
        '      "image_prompts": ["string (detailed visual description)", "string", "string"]\n'
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
        f"{section_instruction}"
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
    mode: str = "short",
    learning_history: list[dict] | None = None,
    age_group: str | None = None,
    goal: str | None = None,
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
    system_prompt = _build_system_prompt(
        learning_style,
        expertise_level,
        perspective,
        interests,
        mode,
        learning_history,
        age_group,
        goal,
    )
    user_prompt = _build_user_prompt(topic, search_results)

    async with httpx.AsyncClient(timeout=180) as client:
        for attempt in range(3):
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
            if response.status_code == 429 and attempt < 2:
                wait = (attempt + 1) * 5
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            break

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


async def aextract_concepts(topic: str, content: GeneratedContent) -> list[str]:
    """Extract key concepts learned from the generated content via LLM."""
    endpoint, api_key = _load_fuseapi_config()
    narration = " ".join(s.narration_text for s in content.sections)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{endpoint}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Extract 5-10 key concepts/terms that a student would "
                            "learn from this lesson. Return ONLY a JSON array of "
                            'short strings, e.g. ["concept1", "concept2"]. '
                            "No markdown, no explanation."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Topic: {topic}\n\nLesson content:\n{narration}",
                    },
                ],
                "temperature": 0.3,
            },
        )
        if resp.status_code != 200:
            return []

    raw = resp.json()["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    try:
        concepts = json.loads(raw)
        return concepts if isinstance(concepts, list) else []
    except json.JSONDecodeError:
        return []
