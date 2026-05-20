"""Use Claude to extract quiz questions from article text."""
import json
import uuid
import anthropic

_client = anthropic.Anthropic()

SYSTEM_PROMPT = """\
אתה עורך שאלות בכיר לתוספת סוף-שבוע של עיתון איכותי.
משימתך: לקרוא קטע מידעי ולהפיק ממנו שאלה טריוויה אחת בלבד.

כללים:
- השאלה חייבת להיות עובדתית, חדה ולא טריוויאלית מדי.
- אין לתת רמזים — רק שאלה ישירה.
- הרמה: מאתגרת אך פתירה לאדם משכיל.
- התשובה חייבת להופיע מפורשות בטקסט.
- פלט: JSON בלבד, ללא כל טקסט נוסף.

פורמט הפלט (JSON בלבד):
{
  "question_text": "...",
  "correct_answer": "...",
  "difficulty": <1-5>
}
"""


def generate_question(article: dict) -> dict | None:
    """Return a single question dict or None on failure."""
    prompt = f"קטגוריה: {article['category']}\nמקור: {article['title']}\n\n{article['text']}"

    try:
        msg = _client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': prompt}],
        )
        raw = msg.content[0].text.strip()
        data = json.loads(raw)
        return {
            'id': str(uuid.uuid4()),
            'category': article['category'],
            'question_text': data['question_text'],
            'correct_answer': data['correct_answer'],
            'metadata': {
                'source_url': article['url'],
                'difficulty': int(data.get('difficulty', 3)),
            },
        }
    except Exception as e:
        print(f'[generator] failed for "{article["title"]}": {e}')
        return None


def generate_batch(articles: list[dict], target: int = 20) -> list[dict]:
    questions = []
    for article in articles:
        if len(questions) >= target:
            break
        q = generate_question(article)
        if q:
            questions.append(q)
    return questions[:target]
