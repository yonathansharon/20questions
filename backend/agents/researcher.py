"""Agent A — Extracts obscure facts via a single direct API call (no tool loop)."""
import json
import os
import re
import google.generativeai as genai

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", ""))


def _extract_json_list(text: str) -> list:
    """Parse a JSON array from model output, tolerating markdown code fences."""
    text = text.strip()
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(text)


SYSTEM_PROMPT = """\
You are a research analyst for a premium Israeli newspaper's weekend trivia section ("20 שאלות" style — Haaretz quality).

Your job: read the provided source text and extract 3–5 facts that can fuel an INDIRECT, surprising trivia question. Think like a puzzle editor, not an encyclopedia.

=== WHAT MAKES A GREAT TRIVIA FACT ===

GOOD facts have one or more of these qualities:
- An unexpected CONNECTION between two seemingly unrelated things
- A surprising ORIGIN of a word, name, or place
- A HIDDEN LINK between a famous person and something mundane or surprising
- A SPECIFIC DATE / NUMBER that is counterintuitive
- A "WHO WAS BEHIND X" — a famous thing created/named after a forgotten person

BAD facts (reject these):
✗ Capital cities, populations, standard dates
✗ Facts that appear on the Wikipedia lead paragraph
✗ Anything a well-read adult would already know

=== QUESTION TYPES TO AIM FOR ===
- "מה מחבר בין X ל-Y?"
- "על שם מי/מה נקרא...?"
- "מי היה ה-X שעשה Y לפני ש...?"
- "אחרי מי / לפני מי / בגלל מי...?"

=== DIFFICULTY LEVELS ===
- EASY: most Israelis over 40 would get it
- MEDIUM: ~30% of well-read adults know it
- HARD: stumps most people

Output ONLY a valid JSON array — no markdown, no commentary:
[
  {
    "entity":          "the main subject",
    "fact":            "the specific, surprising fact in 1-2 sentences",
    "connection":      "the unexpected link that makes this trivia-worthy",
    "question_angle":  "suggested question type",
    "domain":          "history|science|culture|politics|language|sport|geography|other",
    "difficulty":      "EASY|MEDIUM|HARD",
    "obscurity_score": 1-10
  }
]"""


def extract_research_items(
    text: str,
    source_title: str = "",
    skill_hint: str | None = None,
) -> list[dict]:
    """Run Agent A as a single direct API call (no tool loop).

    Returns research items with obscurity_score >= 3.
    If skill_hint is provided it is appended to the system prompt.
    """
    system = SYSTEM_PROMPT
    if skill_hint:
        system += f"\n\nSKILL FOCUS (override all generic guidance above):\n{skill_hint}"

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system,
        )
        user_msg = f"Source title: {source_title}\n\n{text[:7000]}"
        response = model.generate_content(user_msg)

        raw = response.text
        print(f"[researcher] text (first 300): {raw[:300]}", flush=True)
        try:
            items = _extract_json_list(raw)
            filtered = [i for i in items if isinstance(i, dict) and i.get("obscurity_score", 0) >= 3]
            print(f"[researcher] extracted {len(items)} items, {len(filtered)} passed filter", flush=True)
            return filtered
        except Exception as e:
            print(f"[researcher] JSON parse error: {e}", flush=True)

    except Exception as e:
        print(f"[researcher] error: {e}", flush=True)

    return []
