"""Shared LLM configuration — OpenRouter as default provider."""

import os

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-5.1")


def get_llm_config() -> tuple[str, str, str]:
    """Return (base_url, api_key, model) for LLM calls."""
    return OPENROUTER_BASE_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL
