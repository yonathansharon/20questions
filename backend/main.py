"""FastAPI application — autonomous question generation + admin API."""
import json
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()  # load ANTHROPIC_API_KEY from .env before any anthropic client is created

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db
from models import AddSourceRequest, StatsResponse
from source_manager import (
    create_source, list_sources, delete_source,
    get_source, create_job, get_job, run_ingestion,
)
from evaluator import run_evaluation
from skills_manager import (
    list_skills, get_skill, create_skill, delete_skill, seed_builtin_skills
)
from seeds import seed_sample_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = get_db()
    try:
        seed_builtin_skills(db)
        seed_sample_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="20 Questions — Autonomous Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # local network access (phone on same WiFi)
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Quiz endpoints ────────────────────────────────────────────────────────────

@app.get("/api/questions")
def get_questions(limit: int = 20):
    db = get_db()
    try:
        # Always prefer AI-generated questions first, then fill to `limit` with seeded ones.
        ai_rows = db.execute(
            """SELECT id, category, question_text, correct_answer,
                      explanation, difficulty, quality_score
               FROM questions WHERE status='active' AND source_id IS NOT NULL
               ORDER BY RANDOM() LIMIT ?""",
            (limit,),
        ).fetchall()

        if len(ai_rows) >= limit:
            return [dict(r) for r in ai_rows]

        # Fill remaining slots with seeded (non-AI) questions
        remaining = limit - len(ai_rows)
        seed_rows = db.execute(
            """SELECT id, category, question_text, correct_answer,
                      explanation, difficulty, quality_score
               FROM questions WHERE status='active' AND source_id IS NULL
               ORDER BY RANDOM() LIMIT ?""",
            (remaining,),
        ).fetchall()

        return [dict(r) for r in ai_rows] + [dict(r) for r in seed_rows]
    finally:
        db.close()


# ── Source management ────────────────────────────────────────────────────────

@app.get("/api/sources")
def api_list_sources():
    db = get_db()
    try:
        return list_sources(db)
    finally:
        db.close()


@app.post("/api/sources", status_code=201)
def api_create_source(req: AddSourceRequest):
    db = get_db()
    try:
        source = create_source(db, req.type, req.name, req.config.model_dump(), req.skill_id)
        return source
    finally:
        db.close()


@app.delete("/api/sources/{source_id}", status_code=204)
def api_delete_source(source_id: str):
    db = get_db()
    try:
        if not get_source(db, source_id):
            raise HTTPException(404, "Source not found")
        delete_source(db, source_id)
    finally:
        db.close()


@app.post("/api/sources/{source_id}/ingest", status_code=202)
def api_ingest_source(source_id: str, bg: BackgroundTasks):
    db = get_db()
    try:
        if not get_source(db, source_id):
            raise HTTPException(404, "Source not found")
        job_id = create_job(db, source_id)
    finally:
        db.close()
    bg.add_task(run_ingestion, source_id, job_id)
    return {"job_id": job_id, "status": "running"}


# ── Job status ───────────────────────────────────────────────────────────────

@app.get("/api/jobs/recent")
def api_recent_jobs():
    db = get_db()
    try:
        rows = db.execute(
            """SELECT j.id, j.source_id, j.status, j.started_at, j.completed_at,
                      j.questions_generated, j.questions_rejected, j.error_message,
                      s.name AS source_name
               FROM generation_jobs j
               LEFT JOIN sources s ON s.id = j.source_id
               ORDER BY j.started_at DESC LIMIT 20"""
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@app.get("/api/jobs/{job_id}")
def api_get_job(job_id: str):
    db = get_db()
    try:
        job = get_job(db, job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        return job
    finally:
        db.close()


# ── Evaluation ───────────────────────────────────────────────────────────────

@app.get("/api/eval/latest")
def api_latest_eval():
    db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM eval_runs ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        if not row:
            return {"error": "No evaluation runs yet. Click 'Run Evaluation'."}
        d = dict(row)
        d["category_distribution"] = json.loads(d["category_distribution"] or "{}")
        # Attach sampled questions
        ids = json.loads(d.pop("sampled_question_ids", "[]"))
        if ids:
            placeholders = ",".join("?" * len(ids))
            qs = db.execute(
                f"SELECT id, category, question_text, correct_answer, quality_score, difficulty "
                f"FROM questions WHERE id IN ({placeholders})", ids
            ).fetchall()
            d["sampled_questions"] = [dict(q) for q in qs]
        else:
            d["sampled_questions"] = []
        return d
    finally:
        db.close()


@app.post("/api/eval/run")
def api_run_eval():
    db = get_db()
    try:
        result = run_evaluation(db)
        return result
    finally:
        db.close()


# ── Aggregate stats ──────────────────────────────────────────────────────────

@app.get("/api/stats")
def api_stats():
    db = get_db()
    try:
        active   = db.execute("SELECT COUNT(*) FROM questions WHERE status='active'").fetchone()[0]
        rejected = db.execute("SELECT COUNT(*) FROM questions WHERE status='rejected'").fetchone()[0]
        sources  = db.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
        total    = active + rejected
        rate     = round(rejected / total * 100, 1) if total else 0

        last_score_row = db.execute(
            "SELECT system_quality_score FROM eval_runs ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        return {
            "total_active":   active,
            "total_rejected": rejected,
            "rejection_rate": rate,
            "total_sources":  sources,
            "last_eval_score": last_score_row[0] if last_score_row else None,
        }
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug/rejections")
def api_debug_rejections():
    """Return the 30 most recent rejection reasons so we can diagnose pipeline failures."""
    db = get_db()
    try:
        rows = db.execute(
            """SELECT q.rejection_reason, q.created_at, s.name AS source_name
               FROM questions q
               LEFT JOIN sources s ON s.id = q.source_id
               WHERE q.status = 'rejected'
               ORDER BY q.created_at DESC LIMIT 30"""
        ).fetchall()
        reasons = {}
        for r in rows:
            key = r["rejection_reason"] or "unknown"
            reasons[key] = reasons.get(key, 0) + 1
        return {
            "total_rejected": len(rows),
            "by_reason": dict(sorted(reasons.items(), key=lambda x: -x[1])),
            "recent": [dict(r) for r in rows[:10]],
        }
    finally:
        db.close()


# ── Question management (admin) ──────────────────────────────────────────────

@app.get("/api/admin/questions")
def api_admin_questions(status: str = "active", limit: int = 200):
    db = get_db()
    try:
        rows = db.execute(
            """SELECT q.id, q.category, q.question_text, q.correct_answer,
                      q.explanation, q.difficulty, q.quality_score,
                      q.status, q.rejection_reason, q.generation_attempts,
                      q.created_at,
                      s.name AS source_name
               FROM questions q
               LEFT JOIN sources s ON s.id = q.source_id
               WHERE q.status = ?
               ORDER BY q.created_at DESC
               LIMIT ?""",
            (status, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@app.delete("/api/admin/questions/{question_id}", status_code=204)
def api_delete_question(question_id: str):
    db = get_db()
    try:
        row = db.execute("SELECT id FROM questions WHERE id=?", (question_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Question not found")
        db.execute("DELETE FROM questions WHERE id=?", (question_id,))
        db.commit()
    finally:
        db.close()


@app.post("/api/admin/questions/{question_id}/refine")
def api_refine_question(question_id: str, body: dict):
    """Refine a question with action: 'improve' | 'deepen' | 'simplify'"""
    action = body.get("action", "improve")
    if action not in ("improve", "deepen", "simplify"):
        raise HTTPException(422, "action must be one of: improve, deepen, simplify")

    db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM questions WHERE id=?", (question_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Question not found")

        from agents.writer import refine_question
        question = dict(row)
        refined = refine_question(question, action)
        if not refined:
            raise HTTPException(500, "המנוע לא הצליח לשפר את השאלה — נסה שוב")

        db.execute(
            """UPDATE questions
               SET question_text=?, correct_answer=?, difficulty=?, category=?
               WHERE id=?""",
            (refined["question_text"], refined["correct_answer"],
             refined["difficulty"], refined["category"], question_id),
        )
        db.commit()

        updated = dict(db.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone())
        return updated
    finally:
        db.close()


# ── Skills ───────────────────────────────────────────────────────────────────

@app.post("/api/skills/generate-prompts")
def api_generate_skill_prompts(body: dict):
    """
    Takes a plain-language goal and uses Claude to generate
    researcher_hint + writer_style for a new skill.
    """
    goal = (body.get("goal") or "").strip()
    if not goal:
        raise HTTPException(422, "goal is required")

    import os
    from anthropic import Anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set")

    client = Anthropic(api_key=api_key)
    system = """\
You are a senior trivia puzzle architect. Your job is to design "skill" configurations
for an autonomous Hebrew trivia engine that runs two AI agents:
- Agent A (Researcher): extracts surprising facts from source texts
- Agent B (Writer): turns facts into clever, indirect Hebrew trivia questions

Given a plain-language goal, produce two prompts:
1. researcher_hint — English instructions for Agent A: what kinds of facts to seek, what to reject, what makes a fact trivia-worthy for this specific goal
2. writer_style — English instructions for Agent B: what question forms to use, what tone, what to avoid

Rules:
- Both prompts should be specific, actionable, and 3-6 sentences each
- researcher_hint must define a SHARP FILTER — what to extract and what to reject
- writer_style must name preferred question FORMS (e.g. 'מה מחבר בין X ל-Y?')
- Do NOT generate generic prompts — tailor them tightly to the goal
- Output ONLY valid JSON with keys: "researcher_hint", "writer_style", "suggested_name", "suggested_description", "suggested_icon"
"""
    user_msg = f"Design a skill for this goal:\n\n{goal}"

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text
        import re, json as _json
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        result = _json.loads(match.group(0)) if match else _json.loads(raw)
        return result
    except Exception as e:
        raise HTTPException(500, f"שגיאה בייצור פרומפטים: {e}")


@app.get("/api/skills")
def api_list_skills():
    db = get_db()
    try:
        return list_skills(db)
    finally:
        db.close()


@app.post("/api/skills", status_code=201)
def api_create_skill(data: dict):
    db = get_db()
    try:
        return create_skill(db, data)
    finally:
        db.close()


@app.delete("/api/skills/{skill_id}", status_code=204)
def api_delete_skill(skill_id: str):
    db = get_db()
    try:
        if not delete_skill(db, skill_id):
            raise HTTPException(404, "Skill not found")
    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        db.close()
