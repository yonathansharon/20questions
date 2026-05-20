"""Evaluator Service — computes a rolling System Quality Score from sampled questions."""
import json
import uuid
import sqlite3
from datetime import datetime


def run_evaluation(db: sqlite3.Connection, sample_size: int = 10) -> dict:
    """Sample questions, compute metrics, persist eval run, return full result."""
    cur = db.execute(
        """SELECT id, category, question_text, correct_answer,
                  quality_score, difficulty, generation_attempts, created_at
           FROM questions WHERE status = 'active'
           ORDER BY RANDOM() LIMIT ?""",
        (sample_size,),
    )
    rows = cur.fetchall()

    if not rows:
        return {"error": "No active questions in the database yet."}

    cols = ["id", "category", "question_text", "correct_answer",
            "quality_score", "difficulty", "generation_attempts", "created_at"]
    questions = [dict(zip(cols, row)) for row in rows]

    avg_quality = sum(q["quality_score"] for q in questions) / len(questions)
    avg_difficulty = sum(q["difficulty"] for q in questions) / len(questions)

    total_active   = db.execute("SELECT COUNT(*) FROM questions WHERE status='active'").fetchone()[0]
    total_rejected = db.execute("SELECT COUNT(*) FROM questions WHERE status='rejected'").fetchone()[0]
    total_attempted = total_active + total_rejected
    rejection_rate  = (total_rejected / total_attempted * 100) if total_attempted else 0

    cat_rows = db.execute(
        "SELECT category, COUNT(*) FROM questions WHERE status='active' GROUP BY category"
    ).fetchall()
    category_distribution = {r[0]: r[1] for r in cat_rows}

    system_quality_score = round(avg_quality * 10, 1)  # Agent C scores are 0–10 → display 0–100

    run_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db.execute(
        """INSERT INTO eval_runs
           (id, system_quality_score, total_questions, rejection_rate,
            avg_difficulty, category_distribution, sampled_question_ids, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            run_id,
            system_quality_score,
            total_active,
            round(rejection_rate, 1),
            round(avg_difficulty, 2),
            json.dumps(category_distribution),
            json.dumps([q["id"] for q in questions]),
            now,
        ),
    )
    db.commit()

    return {
        "id": run_id,
        "system_quality_score": system_quality_score,
        "total_questions": total_active,
        "total_rejected": total_rejected,
        "rejection_rate": round(rejection_rate, 1),
        "avg_difficulty": round(avg_difficulty, 2),
        "category_distribution": category_distribution,
        "sampled_questions": questions,
        "created_at": now,
    }
