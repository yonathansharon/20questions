"""Agent C — Self-reflection evaluator: scores, zero-shot tests, and verdicts questions."""
import json
import os
import re
import google.generativeai as genai

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", ""))


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(text)


EVAL_SYSTEM = """\
You are a ruthless quality gatekeeper for a premium trivia database.

Evaluate the question below on four axes (1–10 each):

1. ORIGINALITY   — Is this genuinely non-obvious to a well-read adult?
                   (1 = appears in every trivia app; 10 = truly surprising)
2. FORMULATION   — Is the phrasing indirect and sophisticated?
                   (1 = blunt "What is X?"; 10 = masterfully lateral)
3. DIFFICULTY    — How hard is this without Googling?
                   (1 = trivially easy; 10 = stumps experts)
4. PRECISION     — Is the answer a single, unambiguous fact?
                   (1 = vague; 10 = crystal-clear)

composite_score = arithmetic mean of the four scores (float, one decimal).

ZERO-SHOT TEST: also attempt to answer the question yourself, from memory only.
Mark self_answered_correctly = true if your attempted_answer matches the correct answer.

VERDICT logic:
• ACCEPT  if composite_score >= 6.0
• REJECT  otherwise

Note: self_answered_correctly is recorded for analytics but does NOT affect the verdict.

Output ONLY valid JSON — no markdown:
{
  "scores": {
    "originality": N,
    "formulation": N,
    "difficulty":  N,
    "precision":   N
  },
  "composite_score":       N.N,
  "attempted_answer":      "...",
  "self_answered_correctly": true|false,
  "verdict":               "ACCEPT"|"REJECT",
  "rejection_reason":      "specific reason" | null,
  "suggested_improvement": "concrete advice for next attempt" | null
}"""


def evaluate_question(question: dict) -> dict:
    """Run Agent C. Returns full evaluation dict; defaults to REJECT on error."""
    prompt = (
        f"Question:       {question['question_text']}\n"
        f"Correct answer: {question['correct_answer']}\n"
        f"Explanation:    {question.get('explanation', '')}"
    )
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=EVAL_SYSTEM,
        )
        response = model.generate_content(prompt)
        result = _extract_json(response.text)
        # Enforce verdict based solely on composite_score (ignore self_answered_correctly)
        result["verdict"] = "ACCEPT" if result.get("composite_score", 0) >= 6.0 else "REJECT"
        return result
    except Exception as e:
        print(f"[critic] error: {e}")
        return {
            "scores": {},
            "composite_score": 0.0,
            "attempted_answer": "",
            "self_answered_correctly": False,
            "verdict": "REJECT",
            "rejection_reason": f"Evaluation error: {e}",
            "suggested_improvement": None,
        }
