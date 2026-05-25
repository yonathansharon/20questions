import json
import os
import re
import google.generativeai as genai

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", ""))


def _extract_json(text: str) -> dict:
    """Parse JSON from model output, stripping markdown code fences if present."""
    text = text.strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(text)


def execute_writer_agent(fact_context: str, topic_hint: str | None = None) -> dict:
    """
    Agent B (The Writer): Takes a raw historical fact and turns it into a clever,
    indirect trivia question in the style of Haaretz's "20 Questions".
    """
    category_rule = (
        f'5. The "category" field MUST be exactly: "{topic_hint}".'
        if topic_hint
        else '5. Choose the most fitting short Hebrew category label (e.g. היסטוריה / מדע / תרבות / ספורט / אמנות).'
    )

    system_prompt = f"""You are an elite puzzle editor for the weekend edition of Haaretz newspaper.
    Your task is to take a raw historical fact and write a challenging, indirect trivia question.

    RULES:
    1. NEVER ask direct, dry questions like 'In what year was X founded?' or 'Who was the first Y?'.
    2. Use wordplay, cultural context, semantic shifting, or describe an indirect scenario that the user must decipher to get the answer.
    3. The question must be written in excellent, witty Hebrew. ONE sentence only — maximum 25 words. Cut every unnecessary word.
    4. Output MUST be valid JSON with exactly four keys: 'question_text', 'correct_answer', 'difficulty_level' (integer 1-10), and 'category'.
    {category_rule}
    """

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_prompt,
        )
        user_msg = f"Create a Haaretz-style trivia question based on this fact:\n\n{fact_context}"
        response = model.generate_content(user_msg)

        raw = response.text
        print(f"[writer] raw response (first 300): {raw[:300]}", flush=True)
        return _extract_json(raw)

    except Exception as e:
        print(f"[writer] EXCEPTION: {e}", flush=True)
        import traceback; traceback.print_exc()
        return {"error": str(e), "question_text": "Error generating question", "correct_answer": ""}


_REFINE_INSTRUCTIONS = {
    "improve": (
        "שפר את השאלה: הפוך אותה יותר עקיפה, חכמה ומשעשעת. "
        "השתמש בהומור, ניגודים, או הקשר תרבותי כדי להפוך אותה לחידה אמיתית. "
        "שמור על אותה תשובה נכונה."
    ),
    "deepen": (
        "העמק את השאלה: הפוך אותה לקשה יותר — השתמש בהקשרים מורכבים יותר, "
        "בידע מומחה עמוק יותר, ובניסוח שמסתיר את הנושא עוד יותר. "
        "שמור על אותה תשובה נכונה."
    ),
    "simplify": (
        "פשט את השאלה: הפוך אותה לברורה ונגישה יותר לקהל רחב. "
        "השתמש בניסוח ישיר יותר, אך עדיין עקיף ומעניין. "
        "שמור על אותה תשובה נכונה."
    ),
}


def refine_question(question: dict, action: str) -> dict | None:
    """
    Takes an existing question and refines it with the given action:
    'improve' | 'deepen' | 'simplify'
    Returns updated question dict or None on failure.
    """
    instruction = _REFINE_INSTRUCTIONS.get(action, _REFINE_INSTRUCTIONS["improve"])

    system_prompt = f"""You are an elite puzzle editor for Haaretz newspaper's weekend trivia section.
    You will receive an existing trivia question and must refine it according to the given instruction.

    RULES:
    1. The question MUST remain in excellent Hebrew.
    2. ONE sentence only — maximum 25 words. Cut every unnecessary word.
    3. Keep EXACTLY the same correct_answer — do NOT change it.
    4. Output ONLY valid JSON with exactly four keys: 'question_text', 'correct_answer', 'difficulty_level' (integer 1-10), and 'category'.
    5. The "category" field MUST remain: "{question.get('category', 'כללי')}".
    """

    user_msg = f"""Instruction: {instruction}

Existing question:
- question_text: {question['question_text']}
- correct_answer: {question['correct_answer']}
- category: {question.get('category', 'כללי')}
- difficulty: {question.get('difficulty', 5)}

Rewrite it now."""

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=system_prompt,
        )
        response = model.generate_content(user_msg)
        raw = response.text
        print(f"[writer/refine] raw (first 300): {raw[:300]}", flush=True)
        result = _extract_json(raw)

        return {
            "question_text":  result["question_text"],
            "correct_answer": result["correct_answer"],
            "difficulty":     result.get("difficulty_level", result.get("difficulty", question.get("difficulty", 3))),
            "category":       result.get("category", question.get("category", "כללי")),
        }
    except Exception as e:
        print(f"[writer/refine] EXCEPTION: {e}", flush=True)
        import traceback; traceback.print_exc()
        return None


def write_question(research_items: list, writer_style: str | None = None, topic_hint: str | None = None) -> dict | None:
    """Pipeline-compatible wrapper: converts research items → execute_writer_agent."""
    if not research_items:
        return None

    lines = []
    for item in research_items:
        lines.append(f"Entity: {item.get('entity', '')}")
        lines.append(f"Fact: {item.get('fact', '')}")
        if item.get("connection"):
            lines.append(f"Connection: {item['connection']}")
        if item.get("question_angle"):
            lines.append(f"Suggested angle: {item['question_angle']}")
        lines.append("")

    if writer_style:
        lines.append(f"STYLE MANDATE: {writer_style}")

    fact_context = "\n".join(lines).strip()
    result = execute_writer_agent(fact_context, topic_hint=topic_hint)

    if "error" in result or not result.get("question_text"):
        return None

    return {
        "question_text":  result["question_text"],
        "correct_answer": result["correct_answer"],
        "explanation":    result.get("explanation", ""),
        "difficulty":     result.get("difficulty_level", result.get("difficulty", 3)),
        "category":       result.get("category", topic_hint or "כללי"),
    }
