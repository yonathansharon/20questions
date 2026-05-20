"""Fetch article text from Hebrew Wikipedia by rotating categories."""
import random
import wikipediaapi

CATEGORIES = {
    'היסטוריה':  ['מלחמת העולם השנייה', 'האימפריה הרומית', 'מהפכה צרפתית', 'ציביליזציה מצרית'],
    'מדע':       ['תורת הקוונטים', 'גנטיקה', 'יחסות כללית', 'אסטרופיזיקה'],
    'תרבות':     ['תיאטרון יווני', 'אמנות הרנסנס', 'ספרות לטינו-אמריקנית', 'מוזיקה קלאסית'],
    'גאוגרפיה':  ['ים תיכון', 'אמזונס', 'האנטארקטיקה', 'יבשת אפריקה'],
    'טכנולוגיה': ['בינה מלאכותית', 'אינטרנט', 'מהפכה תעשייתית', 'מחשב'],
    'ביולוגיה':  ['אבולוציה', 'תא ביולוגי', 'מוח האדם', 'מערכת החיסון'],
}

_wiki = wikipediaapi.Wikipedia(language='he', user_agent='20Questions/1.0 (quiz-generator)')


def fetch_articles(n_per_category: int = 1) -> list[dict]:
    """Return a list of {category, title, text} dicts."""
    results = []
    for category, titles in CATEGORIES.items():
        sample = random.sample(titles, min(n_per_category, len(titles)))
        for title in sample:
            page = _wiki.page(title)
            if page.exists():
                results.append({
                    'category': category,
                    'title': page.title,
                    'text': page.text[:8000],
                    'url': page.fullurl,
                })
    return results


def fetch_single(title: str, category: str = 'כללי') -> dict | None:
    page = _wiki.page(title)
    if not page.exists():
        return None
    return {
        'category': category,
        'title': page.title,
        'text': page.text[:8000],
        'url': page.fullurl,
    }
