import asyncio
import os
from functools import partial

from firecrawl import Firecrawl


def _extract_doc(doc) -> dict:
    """Extract url/title/markdown from either Document or SearchResultWeb."""
    if hasattr(doc, "metadata") and doc.metadata and hasattr(doc.metadata, "url"):
        return {
            "url": doc.metadata.url or "",
            "markdown": doc.markdown or "",
            "title": doc.metadata.title or "",
        }
    return {
        "url": getattr(doc, "url", "") or "",
        "markdown": getattr(doc, "description", "") or "",
        "title": getattr(doc, "title", "") or "",
    }


def _search_sync(query: str, api_key: str, scrape: bool = False) -> list[dict]:
    """Synchronous Firecrawl search — runs in a thread."""
    firecrawl = Firecrawl(api_key=api_key)
    kwargs: dict = {"limit": 5}
    if scrape:
        kwargs["scrape_options"] = {"formats": ["markdown"]}
    results = firecrawl.search(query, **kwargs)
    docs = results.web or []
    return [_extract_doc(doc) for doc in docs]


async def search_topic(
    topic: str, user_interests: list[str], scrape: bool = False
) -> list[dict]:
    """Search web for topic, personalized by user interests.

    Args:
        scrape: If True, scrape full markdown (slow). If False, use descriptions (fast).
    """
    api_key = os.environ.get("FIRECRAWL_API_KEY", "")
    query = f"{topic} {' '.join(user_interests[:3])}"
    return await asyncio.get_event_loop().run_in_executor(
        None, partial(_search_sync, query, api_key, scrape)
    )
