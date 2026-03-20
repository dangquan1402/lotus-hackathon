"""Simple test script for Firecrawl Python SDK.

Tests scraping, crawling, and searching capabilities.
Requires: uv pip install firecrawl python-dotenv
Set FIRECRAWL_API_KEY in .env or as env var.
"""

import os

from dotenv import load_dotenv
from firecrawl import Firecrawl

load_dotenv()

API_KEY = os.environ.get("FIRECRAWL_API_KEY", "fc-YOUR_API_KEY")

firecrawl = Firecrawl(api_key=API_KEY)


def test_scrape_single_url():
    """Test scraping a single URL and getting markdown output."""
    result = firecrawl.scrape(
        "https://www.firecrawl.dev/app",
        formats=["markdown"],
    )
    assert result is not None
    assert result.markdown is not None
    print("Scrape result (first 500 chars):")
    print(result.markdown[:500])
    print("---")


def test_scrape_html_format():
    """Test scraping with both markdown and HTML formats."""
    result = firecrawl.scrape(
        "https://www.firecrawl.dev/app",
        formats=["markdown", "html"],
    )
    assert result is not None
    assert result.markdown is not None
    assert result.html is not None
    print(f"HTML length: {len(result.html)} chars")
    print(f"Markdown length: {len(result.markdown)} chars")
    print("---")


def test_crawl_website():
    """Test crawling a website with a small page limit."""
    result = firecrawl.crawl(
        "https://www.firecrawl.dev",
        limit=3,
        scrape_options={"formats": ["markdown"]},
    )
    assert result is not None
    print(f"Crawl status: {result.status}")
    print(f"Total pages: {result.total}")
    print(f"Completed: {result.completed}")
    for i, doc in enumerate(result.data or []):
        url = doc.metadata.source_url if doc.metadata else "unknown"
        md_len = len(doc.markdown or "")
        print(f"  Page {i + 1}: {url} ({md_len} chars)")
    print("---")


def test_map_website():
    """Test mapping a website to discover URLs."""
    result = firecrawl.map("https://www.firecrawl.dev")
    assert result is not None
    links = result.links or []
    print(f"Map found {len(links)} links:")
    for link in links[:10]:
        print(f"  - {link.url}")
    if len(links) > 10:
        print(f"  ... and {len(links) - 10} more")
    print("---")


if __name__ == "__main__":
    tests = [
        test_scrape_single_url,
        test_scrape_html_format,
        test_crawl_website,
        test_map_website,
    ]
    for test_fn in tests:
        print(f"\n>> Running {test_fn.__name__}...")
        try:
            test_fn()
            print("   PASSED")
        except Exception as e:
            print(f"   FAILED: {e}")
