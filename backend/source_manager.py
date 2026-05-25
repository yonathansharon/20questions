"""Source CRUD and ingestion dispatch."""
import uuid
import json
import sqlite3
from datetime import datetime

from ingestion.wikipedia import fetch_article
from ingestion.url_fetcher import fetch_url
from ingestion.rss_fetcher import fetch_rss
from pipeline import run_pipeline


def _chunk_text(text: str, max_chars: int = 4000, max_chunks: int = 2) -> list[str]:
    """Split raw text into paragraph-aware chunks for pipeline ingestion."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    chunks, current, current_len = [], [], 0
    for para in paragraphs:
        if current_len + len(para) > max_chars and current:
            chunks.append('\n\n'.join(current))
            if len(chunks) >= max_chunks:
                return chunks
            current, current_len = [], 0
        current.append(para)
        current_len += len(para)
    if current and len(chunks) < max_chunks:
        chunks.append('\n\n'.join(current))
    return chunks or [text[:max_chars]]


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_source(
    db: sqlite3.Connection,
    type_: str,
    name: str,
    config: dict,
    skill_id: str | None = None,
) -> dict:
    sid = str(uuid.uuid4())
    db.execute(
        "INSERT INTO sources (id, type, name, config, skill_id) VALUES (?, ?, ?, ?, ?)",
        (sid, type_, name, json.dumps(config), skill_id),
    )
    db.commit()
    return get_source(db, sid)


def get_source(db: sqlite3.Connection, source_id: str) -> dict | None:
    row = db.execute("SELECT * FROM sources WHERE id=?", (source_id,)).fetchone()
    return _row_to_source(row) if row else None


def list_sources(db: sqlite3.Connection) -> list[dict]:
    rows = db.execute("""
        SELECT s.*,
               COUNT(CASE WHEN q.status='active' THEN 1 END) AS question_count
        FROM sources s
        LEFT JOIN questions q ON q.source_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
    """).fetchall()
    return [_row_to_source(r) for r in rows]


def delete_source(db: sqlite3.Connection, source_id: str) -> bool:
    db.execute("DELETE FROM sources WHERE id=?", (source_id,))
    db.execute("DELETE FROM documents WHERE source_id=?", (source_id,))
    db.commit()
    return True


def _row_to_source(row) -> dict:
    d = dict(row)
    d["config"] = json.loads(d["config"])
    return d


# ── Ingestion ─────────────────────────────────────────────────────────────────

def create_job(db: sqlite3.Connection, source_id: str) -> str:
    job_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO generation_jobs (id, source_id, status, started_at) VALUES (?,?,?,?)",
        (job_id, source_id, "running", datetime.utcnow().isoformat()),
    )
    db.commit()
    return job_id


def get_job(db: sqlite3.Connection, job_id: str) -> dict | None:
    row = db.execute("SELECT * FROM generation_jobs WHERE id=?", (job_id,)).fetchone()
    return dict(row) if row else None


def run_ingestion(source_id: str, job_id: str) -> None:
    """Background task: fetch → pipeline → persist. Opens its own DB connection."""
    import traceback
    print(f"[run_ingestion] START job={job_id} source={source_id}", flush=True)
    from database import get_db
    db = get_db()
    try:
        _ingest(db, source_id, job_id)
    except Exception as e:
        print(f"[run_ingestion] EXCEPTION: {e}", flush=True)
        traceback.print_exc()
        db.execute(
            "UPDATE generation_jobs SET status='failed', error_message=?, completed_at=? WHERE id=?",
            (str(e), datetime.utcnow().isoformat(), job_id),
        )
        db.execute("UPDATE sources SET status='error', error_message=? WHERE id=?", (str(e), source_id))
        db.commit()
    finally:
        db.close()
    print(f"[run_ingestion] DONE job={job_id}", flush=True)


def _ingest(db: sqlite3.Connection, source_id: str, job_id: str) -> None:
    from skills_manager import get_skill

    source = get_source(db, source_id)
    if not source:
        raise ValueError(f"Source {source_id} not found")

    # Resolve skill (may be None)
    skill = get_skill(db, source.get("skill_id")) if source.get("skill_id") else None

    db.execute("UPDATE sources SET status='ingesting' WHERE id=?", (source_id,))
    db.commit()

    cfg = source["config"]
    raw_docs: list[dict] = []

    if source["type"] == "wikipedia":
        title = cfg.get("article_title", "")
        lang = cfg.get("language", "he")
        doc = fetch_article(title, lang)
        if doc:
            raw_docs.append(doc)

    elif source["type"] == "url":
        doc = fetch_url(cfg.get("url", ""))
        if doc:
            raw_docs.append(doc)

    elif source["type"] == "rss":
        raw_docs = fetch_rss(cfg.get("url", ""), int(cfg.get("max_articles", 5)))

    elif source["type"] == "local_archive":
        raw_text = (cfg.get("raw_text") or "").strip()
        if raw_text:
            chunks = _chunk_text(raw_text, max_chars=3000, max_chunks=5)
            for i, chunk in enumerate(chunks):
                raw_docs.append({
                    "title": f"{source['name']} — חלק {i + 1}",
                    "content": chunk,
                    "url": None,
                })

    generated = rejected = 0

    for raw in raw_docs:
        # Persist document
        doc_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO documents (id, source_id, title, content, url) VALUES (?,?,?,?,?)",
            (doc_id, source_id, raw.get("title"), raw["content"], raw.get("url")),
        )
        db.commit()

        doc = {**raw, "id": doc_id}
        question, meta = run_pipeline(doc, skill=skill, topic=cfg.get("topic") or None)

        if question:
            db.execute(
                """INSERT INTO questions
                   (id, source_id, document_id, category, question_text,
                    correct_answer, explanation, difficulty, quality_score,
                    status, generation_attempts)
                   VALUES (?,?,?,?,?,?,?,?,?,'active',?)""",
                (
                    question["id"], source_id, doc_id,
                    question["category"], question["question_text"],
                    question["correct_answer"], question.get("explanation", ""),
                    question["difficulty"], question["quality_score"],
                    question["generation_attempts"],
                ),
            )
            generated += 1
        else:
            # Record rejected attempts for metrics
            for reason in meta.get("rejections", []):
                db.execute(
                    """INSERT INTO questions
                       (id, source_id, document_id, category, question_text,
                        correct_answer, status, rejection_reason)
                       VALUES (?,?,?,?,?,?,'rejected',?)""",
                    (str(uuid.uuid4()), source_id, doc_id,
                     "rejected", "—", "—", reason),
                )
            rejected += 1
        db.commit()

    now = datetime.utcnow().isoformat()
    db.execute(
        """UPDATE generation_jobs
           SET status='completed', completed_at=?,
               questions_generated=?, questions_rejected=?
           WHERE id=?""",
        (now, generated, rejected, job_id),
    )
    doc_count = db.execute(
        "SELECT COUNT(*) FROM documents WHERE source_id=?", (source_id,)
    ).fetchone()[0]
    db.execute(
        "UPDATE sources SET status='idle', last_ingested=?, doc_count=? WHERE id=?",
        (now, doc_count, source_id),
    )
    db.commit()
    print(f"[source_manager] job {job_id}: {generated} generated, {rejected} rejected")
