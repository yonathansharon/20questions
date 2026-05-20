"""Ingest articles from Wikipedia (Hebrew or English)."""
import wikipediaapi


def fetch_article(title: str, language: str = "he") -> dict | None:
    wiki = wikipediaapi.Wikipedia(
        language=language,
        user_agent="20Questions/2.0 (autonomous-quiz-generator)",
    )
    page = wiki.page(title)
    if not page.exists():
        return None
    return {
        "title": page.title,
        "content": page.text[:9000],
        "url": page.fullurl,
    }


def fetch_category_articles(
    category: str,
    language: str = "he",
    max_articles: int = 5,
) -> list[dict]:
    """Fetch up to max_articles pages from a Wikipedia category."""
    wiki = wikipediaapi.Wikipedia(
        language=language,
        user_agent="20Questions/2.0 (autonomous-quiz-generator)",
    )
    cat = wiki.page(f"Category:{category}")
    results = []
    for title, page in cat.categorymembers.items():
        if len(results) >= max_articles:
            break
        if page.ns == 0 and page.exists():
            results.append({
                "title": page.title,
                "content": page.text[:9000],
                "url": page.fullurl,
            })
    return results
