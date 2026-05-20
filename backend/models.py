"""Pydantic request/response models."""
from pydantic import BaseModel
from typing import Optional, Literal, Any


class SourceConfig(BaseModel):
    article_title: Optional[str] = None
    language: str = "he"
    url: Optional[str] = None
    max_articles: int = 5
    raw_text: Optional[str] = None  # used by local_archive type
    topic: Optional[str] = None     # optional category hint for Agent B


class AddSourceRequest(BaseModel):
    type: Literal["wikipedia", "url", "rss", "local_archive"]
    name: str
    config: SourceConfig
    skill_id: Optional[str] = None


class SourceResponse(BaseModel):
    id: str
    type: str
    name: str
    config: dict
    status: str
    last_ingested: Optional[str]
    doc_count: int
    error_message: Optional[str]
    created_at: str


class QuestionRecord(BaseModel):
    id: str
    category: str
    question_text: str
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: int = 3
    quality_score: float = 0
    status: str = "active"
    metadata: Optional[dict] = None


class JobStatus(BaseModel):
    id: str
    source_id: Optional[str]
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    questions_generated: int
    questions_rejected: int
    error_message: Optional[str]


class EvalResult(BaseModel):
    id: str
    system_quality_score: float
    total_questions: int
    rejection_rate: float
    avg_difficulty: float
    category_distribution: dict
    sampled_questions: list[dict]
    created_at: str


class StatsResponse(BaseModel):
    total_active: int
    total_rejected: int
    rejection_rate: float
    total_sources: int
    last_eval_score: Optional[float]
