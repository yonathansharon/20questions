"""Orchestrates the A → B → C multi-agent pipeline for a single document."""
import time
import uuid
from agents.researcher import extract_research_items
from agents.writer import write_question
from agents.critic import evaluate_question

# Gemini free tier: 15 requests/minute → wait ~4s between calls
_API_DELAY = 4.0

MAX_RETRIES = 1


def run_pipeline(document: dict, skill: dict | None = None, topic: str | None = None) -> tuple[dict | None, dict]:
    """
    Process one document through the full agent chain.

    Args:
        document: ingested document dict with id, title, content, url.
        skill:    optional skill dict from skills table — injects targeted prompts
                  into Agent A (researcher_hint) and Agent B (writer_style).

    Returns:
        (accepted_question | None,  pipeline_metadata)
    """
    meta = {
        "document_id": document.get("id"),
        "source_title": document.get("title", ""),
        "skill_id": skill["id"] if skill else None,
        "skill_name": skill["name"] if skill else None,
        "attempts": 0,
        "rejections": [],
        "final_eval": None,
    }

    researcher_hint = skill.get("researcher_hint") if skill else None
    writer_style    = skill.get("writer_style")    if skill else None

    # ── Agent A: Research ─────────────────────────────────────────
    research_items = extract_research_items(
        document["content"], document.get("title", ""), skill_hint=researcher_hint
    )
    if not research_items:
        meta["rejections"].append("Agent A: no quality research items extracted")
        return None, meta

    time.sleep(_API_DELAY)  # rate-limit guard

    # ── Agent B + C loop ─────────────────────────────────────────
    for attempt in range(1, MAX_RETRIES + 1):
        meta["attempts"] = attempt

        question = write_question(research_items, writer_style=writer_style, topic_hint=topic)
        if not question:
            meta["rejections"].append(f"Attempt {attempt}: Agent B returned nothing")
            continue

        time.sleep(_API_DELAY)  # rate-limit guard

        eval_result = evaluate_question(question)
        meta["final_eval"] = eval_result

        if eval_result.get("verdict") == "ACCEPT":
            return {
                "id": str(uuid.uuid4()),
                "category": question.get("category", "כללי"),
                "question_text": question["question_text"],
                "correct_answer": question["correct_answer"],
                "explanation": question.get("explanation", ""),
                "difficulty": int(question.get("difficulty", 3)),
                "quality_score": float(eval_result.get("composite_score", 0)),
                "generation_attempts": attempt,
                "source_url": document.get("url", ""),
                "document_id": document.get("id", ""),
            }, meta

        # Rejected — feed hint into next attempt
        reason = eval_result.get("rejection_reason", "unknown")
        meta["rejections"].append(f"Attempt {attempt}: {reason}")
        hint = eval_result.get("suggested_improvement")
        if hint and research_items:
            research_items[0]["improvement_hint"] = hint

    return None, meta
