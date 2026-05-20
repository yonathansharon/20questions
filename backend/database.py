"""SQLite database setup and connection factory."""
import sqlite3
import pathlib

DB_PATH = pathlib.Path(__file__).parent / "quiz.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS skills (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    icon             TEXT DEFAULT '🎯',
    color            TEXT DEFAULT '#F5C518',
    researcher_hint  TEXT,
    writer_style     TEXT,
    min_difficulty   INTEGER DEFAULT 2,
    is_builtin       INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    config      TEXT NOT NULL,
    skill_id    TEXT REFERENCES skills(id) ON DELETE SET NULL,
    status      TEXT DEFAULT 'idle',
    last_ingested TEXT,
    doc_count   INTEGER DEFAULT 0,
    error_message TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    source_id   TEXT REFERENCES sources(id) ON DELETE CASCADE,
    title       TEXT,
    content     TEXT NOT NULL,
    url         TEXT,
    ingested_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
    id                  TEXT PRIMARY KEY,
    source_id           TEXT,
    document_id         TEXT,
    category            TEXT NOT NULL,
    question_text       TEXT NOT NULL,
    correct_answer      TEXT NOT NULL,
    explanation         TEXT,
    difficulty          INTEGER DEFAULT 3,
    quality_score       REAL DEFAULT 0,
    status              TEXT DEFAULT 'active',
    rejection_reason    TEXT,
    generation_attempts INTEGER DEFAULT 1,
    metadata            TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generation_jobs (
    id                  TEXT PRIMARY KEY,
    source_id           TEXT,
    status              TEXT DEFAULT 'pending',
    started_at          TEXT,
    completed_at        TEXT,
    questions_generated INTEGER DEFAULT 0,
    questions_rejected  INTEGER DEFAULT 0,
    error_message       TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS eval_runs (
    id                   TEXT PRIMARY KEY,
    system_quality_score REAL,
    total_questions      INTEGER,
    rejection_rate       REAL,
    avg_difficulty       REAL,
    category_distribution TEXT,
    sampled_question_ids  TEXT,
    created_at           TEXT DEFAULT (datetime('now'))
);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(SCHEMA)
        # Migration: add skill_id to sources if the table predates the skills system
        try:
            conn.execute("ALTER TABLE sources ADD COLUMN skill_id TEXT REFERENCES skills(id) ON DELETE SET NULL")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # column already exists
