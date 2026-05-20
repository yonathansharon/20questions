"""Fetch and extract readable text from a URL."""
import httpx
from bs4 import BeautifulSoup


def fetch_url(url: str, timeout: int = 15) -> dict | None:
    try:
        resp = httpx.get(url, timeout=timeout, follow_redirects=True,
                         headers={"User-Agent": "20Questions/2.0"})
        resp.raise_for_status()
    except Exception as e:
        print(f"[url_fetcher] failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title else url
    paragraphs = [p.get_text(separator=" ", strip=True) for p in soup.find_all("p") if len(p.get_text()) > 80]
    content = "\n\n".join(paragraphs)[:9000]

    if not content.strip():
        return None

    return {
        "title": title,
        "content": content,
        "url": url,
    }
