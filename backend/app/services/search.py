import os

from firecrawl import FirecrawlApp


async def search_topic(topic: str, user_interests: list[str]) -> list[dict]:
    """Search web for topic, personalized by user interests.

    Args:
        topic: The topic to search for.
        user_interests: List of user interests to personalize the query.

    Returns:
        List of dicts with keys: url, markdown, title.
    """
    firecrawl = FirecrawlApp(api_key=os.environ.get("FIRECRAWL_API_KEY", ""))
    query = f"{topic} {' '.join(user_interests[:3])}"
    results = firecrawl.search(query, limit=5, scrape_options={"formats": ["markdown"]})
    raw = results.get("data", []) if isinstance(results, dict) else results
    return [
        {
            "url": r.get("url", ""),
            "markdown": r.get("markdown", ""),
            "title": r.get("title", ""),
        }
        for r in raw
    ]
