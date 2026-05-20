"""Skills CRUD and built-in skill seeding."""
import uuid
import sqlite3

BUILTIN_SKILLS = [
    {
        "id": "skill-hidden-connections",
        "name": "חיבורים נסתרים",
        "description": "מגלה קשרים מפתיעים בין תחומים שונים לחלוטין",
        "icon": "🔗",
        "color": "#8B5CF6",
        "researcher_hint": (
            "Focus EXCLUSIVELY on cross-domain connections: how does this topic "
            "unexpectedly intersect with science, art, economics, or politics in a "
            "non-obvious way? Only extract facts that build a bridge between two "
            "seemingly unrelated fields. Reject any fact that belongs to a single domain."
        ),
        "writer_style": (
            "The question MUST reveal a surprising bridge between two unrelated domains. "
            "Preferred form: 'מה מחבר בין [A] ל-[B]?' or 'כיצד [entity from domain X] "
            "השפיע על [domain Y]?'. Never ask about a single domain in isolation."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-surprising-numbers",
        "name": "מספרים מפתיעים",
        "description": "שאלות על כמויות ויחסים שמפתיעים את ההגיון",
        "icon": "🔢",
        "color": "#3B82F6",
        "researcher_hint": (
            "Focus ONLY on counterintuitive statistics, surprising quantities, unexpected "
            "ratios, record-breaking numbers, or scale comparisons that violate common "
            "intuition. Every extracted fact must contain a specific number that would "
            "make someone say 'I had no idea it was THAT much/many/few/small'."
        ),
        "writer_style": (
            "The question must challenge the reader's sense of scale or proportion. "
            "Preferred forms: 'כמה פעמים יותר...?', 'מה היה אחוז ה...?', or juxtapose "
            "two unexpected quantities. The answer must be a specific number."
        ),
        "min_difficulty": 2,
        "is_builtin": 1,
    },
    {
        "id": "skill-turning-points",
        "name": "נקודות מפנה",
        "description": "רגעים שבהם אירוע קטן שינה את מהלך ההיסטוריה",
        "icon": "🔄",
        "color": "#D97706",
        "researcher_hint": (
            "Extract pivotal moments where a small, often overlooked decision, accident, "
            "or coincidence led to enormous and unexpected consequences. Focus on the "
            "'what if' factor — the hidden contingency that changed the course of events. "
            "The cause must feel disproportionately small relative to its effect."
        ),
        "writer_style": (
            "Questions about cause-and-effect chains where the cause is shocking. "
            "Preferred: 'איזה אירוע לכאורה זניח גרם ל...?' or 'כתוצאה מאיזה כישלון "
            "נוצר...?'. The reader must feel the weight of contingency."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-double-identity",
        "name": "זהויות כפולות",
        "description": "ישויות המפורסמות בשני תחומים נפרדים לחלוטין",
        "icon": "🎭",
        "color": "#10B981",
        "researcher_hint": (
            "Find entities (people, places, organisations, objects) that are famous or "
            "significant in two completely different and seemingly contradictory fields. "
            "Examples: a scientist who was also a poet; a building that serves two "
            "unexpected functions; an event that is a milestone in two different domains. "
            "Both identities must be non-trivial."
        ),
        "writer_style": (
            "The question juxtaposes two contradictory facets of the same entity. "
            "Form: 'מי היה גם [A] וגם [B] הנראים סותרים?' or 'איזה [X] משמש גם כ-[Y]?'. "
            "Both sides of the identity must be present in the question."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-parallel-events",
        "name": "אירועים מקבילים",
        "description": "צירופי מקרים היסטוריים מפתיעים באותה תקופה",
        "icon": "⏱️",
        "color": "#EF4444",
        "researcher_hint": (
            "Find surprising temporal coincidences — events that happened in the same year "
            "or decade but appear completely unrelated. For every fact extracted, also note "
            "what major event in a DIFFERENT domain coincided with it. The juxtaposition "
            "must feel genuinely surprising, not just chronologically adjacent."
        ),
        "writer_style": (
            "Questions with temporal juxtaposition. Required form: 'אותה השנה ש-[X] "
            "אירע, מה [Y] גם כן קרה?' or 'מה התרחש בשנת [Z] שסתר לחלוטין את [W]?'. "
            "Both events must be in different domains."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-behind-the-name",
        "name": "מאחורי השם",
        "description": "מקורות שמות וכינויים שיש מאחוריהם סיפור מפתיע",
        "icon": "🏷️",
        "color": "#EC4899",
        "researcher_hint": (
            "Focus on etymology, naming origins, renamed things, eponyms, misnomers, or "
            "words/places whose origin tells a surprising story. Only extract names whose "
            "origin CONTRADICTS common assumptions or is genuinely counter-intuitive. "
            "Avoid famous names whose origin is already well-known."
        ),
        "writer_style": (
            "Questions about the surprising origins of names and terms. Avoid the direct "
            "form 'על שם מי/מה נקרא [X]?' — instead use indirect forms: 'אילו נסיבות "
            "הביאו לכך ש-[X] נקרא [Y]?' or 'מה מסתתר מאחורי השם [Z]?'."
        ),
        "min_difficulty": 2,
        "is_builtin": 1,
    },
    {
        "id": "skill-forgotten-history",
        "name": "מה שנשכח מההיסטוריה",
        "description": "דמויות ואירועים שנמחקו מהזיכרון הקולקטיבי למרות חשיבותם",
        "icon": "🪦",
        "color": "#6B7280",
        "researcher_hint": (
            "Seek out historical figures, events, or inventions that were once central "
            "but are now almost entirely forgotten by the general public. Look for: "
            "people who were overshadowed by more famous contemporaries despite doing the "
            "real work; events that were erased from official history; inventions credited "
            "to the wrong person. The 'forgotten' angle must be the core of the fact."
        ),
        "writer_style": (
            "Questions that rehabilitate the forgotten. Preferred forms: 'מי היה האדם "
            "שבלעדיו [הישג מפורסם] לא היה קורה, ושמו נשכח?' or 'איזה אירוע נמחק "
            "מספרי הלימוד למרות ש...?'. The question must create a sense of historical injustice."
        ),
        "min_difficulty": 4,
        "is_builtin": 1,
    },
    {
        "id": "skill-invention-origin",
        "name": "מאחורי ההמצאה",
        "description": "הסיפורים האמיתיים מאחורי המצאות ידועות — לא תמיד מי שחושבים",
        "icon": "💡",
        "color": "#F59E0B",
        "researcher_hint": (
            "Dig into the real, often murky, history of inventions and discoveries: "
            "cases of stolen credit, simultaneous independent invention, accidental "
            "discovery, or inventions that failed commercially before succeeding. "
            "Priority: facts where the common attribution (Edison, Columbus, etc.) "
            "is wrong or deeply oversimplified. The surprise must be in WHO or HOW."
        ),
        "writer_style": (
            "Questions that subvert the myth of the lone inventor. Preferred: "
            "'מי המציא בפועל את [X] בעוד ש-[Y] קיבל את הקרדיט?' or 'כיצד "
            "[המצאה מפורסמת] נולדה בטעות תוך כדי ניסיון ל...?'. "
            "The reader must feel that the textbook version is incomplete."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-israel-world",
        "name": "ישראל ובעולם",
        "description": "קשרים מפתיעים בין ישראל לאירועים עולמיים",
        "icon": "🌍",
        "color": "#2563EB",
        "researcher_hint": (
            "Find surprising, non-obvious connections between Israeli people, places, "
            "institutions, or events and major world events, figures, or phenomena. "
            "Focus on: Israelis who played unknown roles in global history; "
            "Israeli inventions or ideas that shaped the world without credit; "
            "historical moments where Israel or Israelis appear unexpectedly. "
            "Avoid generic Zionist-history facts — seek the genuinely counterintuitive."
        ),
        "writer_style": (
            "Questions that place Israel in a surprising global context. "
            "Preferred: 'מה הקשר הלא-צפוי בין [אירוע עולמי] לבין [אדם/מקום ישראלי]?' "
            "or 'כיצד [ישראלי/ת] השפיע/ה על [תחום עולמי] מבלי שרוב העולם יודע זאת?'. "
            "The Israeli angle must feel genuinely surprising."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
    {
        "id": "skill-mistakes-that-matter",
        "name": "טעויות שעיצבו עולמות",
        "description": "כישלונות, תאונות ואי-הבנות שהניבו תוצאות היסטוריות",
        "icon": "💥",
        "color": "#DC2626",
        "researcher_hint": (
            "Find cases where a mistake, accident, misunderstanding, or failure produced "
            "an outcome far more significant than the original intention — and where this "
            "causal chain is NOT widely known. The mistake must be the direct cause. "
            "Examples: scientific discoveries by accident; military blunders that ended "
            "wars; miscommunications that started them; commercial failures that became "
            "new industries. Reject any fact where the mistake is already famous."
        ),
        "writer_style": (
            "Questions built around ironic causality — the bigger the gap between the "
            "trivial mistake and its enormous consequence, the better. "
            "Preferred: 'כיצד [תאונה/כישלון] הוביל ל-[תוצאה הפוכה לחלוטין]?' or "
            "'מה קרה כשמישהו ניסה [X] ובטעות יצר [Y]?'. "
            "Tone: ironic, with a hint of dark humor."
        ),
        "min_difficulty": 3,
        "is_builtin": 1,
    },
]


def seed_builtin_skills(db: sqlite3.Connection) -> None:
    """Insert built-in skills if they don't exist yet."""
    for s in BUILTIN_SKILLS:
        existing = db.execute("SELECT id FROM skills WHERE id=?", (s["id"],)).fetchone()
        if not existing:
            db.execute(
                """INSERT INTO skills
                   (id, name, description, icon, color,
                    researcher_hint, writer_style, min_difficulty, is_builtin)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (s["id"], s["name"], s["description"], s["icon"], s["color"],
                 s["researcher_hint"], s["writer_style"], s["min_difficulty"], s["is_builtin"]),
            )
    db.commit()


def list_skills(db: sqlite3.Connection) -> list[dict]:
    rows = db.execute(
        """SELECT s.*,
                  (SELECT COUNT(*) FROM sources WHERE skill_id=s.id) AS source_count
           FROM skills s ORDER BY is_builtin DESC, name"""
    ).fetchall()
    return [dict(r) for r in rows]


def get_skill(db: sqlite3.Connection, skill_id: str) -> dict | None:
    row = db.execute("SELECT * FROM skills WHERE id=?", (skill_id,)).fetchone()
    return dict(row) if row else None


def create_skill(db: sqlite3.Connection, data: dict) -> dict:
    sid = str(uuid.uuid4())
    db.execute(
        """INSERT INTO skills
           (id, name, description, icon, color, researcher_hint, writer_style, min_difficulty)
           VALUES (?,?,?,?,?,?,?,?)""",
        (sid, data["name"], data.get("description", ""),
         data.get("icon", "🎯"), data.get("color", "#F5C518"),
         data.get("researcher_hint", ""), data.get("writer_style", ""),
         int(data.get("min_difficulty", 2))),
    )
    db.commit()
    return get_skill(db, sid)


def delete_skill(db: sqlite3.Connection, skill_id: str) -> bool:
    row = db.execute("SELECT is_builtin FROM skills WHERE id=?", (skill_id,)).fetchone()
    if not row:
        return False
    if row["is_builtin"]:
        raise ValueError("לא ניתן למחוק כישור מובנה")
    db.execute("UPDATE sources SET skill_id=NULL WHERE skill_id=?", (skill_id,))
    db.execute("DELETE FROM skills WHERE id=?", (skill_id,))
    db.commit()
    return True
