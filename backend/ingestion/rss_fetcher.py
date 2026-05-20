"""Fetch articles from an RSS feed."""
import feedparser
import httpx
from bs4 import BeautifulSoup


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator=" ", strip=True)[:9000]


def fetch_rss(feed_url: str, max_articles: int = 5) -> list[dict]:
    feed = feedparser.parse(feed_url)
    results = []
    for entry in feed.entries[:max_articles]:
        content = ""
        if hasattr(entry, "content") and entry.content:
            content = _extract_text(entry.content[0].value)
        elif hasattr(entry, "summary"):
            content = _extract_text(entry.summary)

        if len(content) < 200:
            # Try fetching the full article link
            try:
                resp = httpx.get(entry.link, timeout=10, follow_redirects=True,
                                 headers={"User-Agent": "20Questions/2.0"})
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                paragraphs = [p.get_text(separator=" ", strip=True)
                              for p in soup.find_all("p") if len(p.get_text()) > 80]
                content = "\n\n".join(paragraphs)[:9000]
            except Exception:
                pass

        if content.strip():
            results.append({
                "title": entry.get("title", "Untitled"),
                "content": content,
                "url": entry.get("link", feed_url),
            })
    return results
