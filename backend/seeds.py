"""Seed the DB with sample sources and pre-loaded questions on first run."""
import json
import sqlite3
import uuid

SAMPLE_SOURCES = [
    {
        "id": "seed-src-einstein",
        "type": "wikipedia",
        "name": "אלברט איינשטיין",
        "config": {"article_title": "אלברט איינשטיין", "language": "he"},
        "skill_id": "skill-double-identity",
    },
    {
        "id": "seed-src-ww2",
        "type": "wikipedia",
        "name": "מלחמת העולם השנייה",
        "config": {"article_title": "מלחמת העולם השנייה", "language": "he"},
        "skill_id": "skill-turning-points",
    },
    {
        "id": "seed-src-internet",
        "type": "wikipedia",
        "name": "האינטרנט",
        "config": {"article_title": "אינטרנט", "language": "he"},
        "skill_id": "skill-hidden-connections",
    },
    {
        "id": "seed-src-olympics",
        "type": "wikipedia",
        "name": "המשחקים האולימפיים",
        "config": {"article_title": "המשחקים האולימפיים", "language": "he"},
        "skill_id": "skill-surprising-numbers",
    },
    {
        "id": "seed-src-dna",
        "type": "wikipedia",
        "name": "DNA",
        "config": {"article_title": "DNA", "language": "he"},
        "skill_id": "skill-surprising-numbers",
    },
    {
        "id": "seed-src-french-rev",
        "type": "wikipedia",
        "name": "המהפכה הצרפתית",
        "config": {"article_title": "המהפכה הצרפתית", "language": "he"},
        "skill_id": "skill-turning-points",
    },
    {
        "id": "seed-src-israel",
        "type": "wikipedia",
        "name": "הקמת מדינת ישראל",
        "config": {"article_title": "הכרזת העצמאות של ישראל", "language": "he"},
        "skill_id": "skill-parallel-events",
    },
    {
        "id": "seed-src-shakespeare",
        "type": "wikipedia",
        "name": "וויליאם שייקספיר",
        "config": {"article_title": "וויליאם שייקספיר", "language": "he"},
        "skill_id": "skill-behind-the-name",
    },
]

SAMPLE_QUESTIONS = [
    {
        "category": "מדע",
        "question_text": "איזו תופעה פיזיקלית גרמה לאיינשטיין להבין שהזמן והמרחב אינם מוחלטים?",
        "correct_answer": "עקרון היחסיות — מהירות האור קבועה לכל המתבוננים ללא קשר לתנועתם",
        "explanation": "ניסוי מיכלסון-מורלי הראה שמהירות האור אינה משתנה עם תנועת המתבונן, מה שהוביל לתורת היחסיות הפרטית ב-1905.",
        "difficulty": 3,
        "quality_score": 8.2,
    },
    {
        "category": "היסטוריה",
        "question_text": "איזה אירוע לכאורה קטן בסרייבו ב-1914 הצית את מלחמת העולם הראשונה?",
        "correct_answer": "התנקשות בארכידוכס פרנץ פרדיננד מאוסטריה",
        "explanation": "ירייה אחת של גבריאלו פרינציפ הניעה שרשרת ברית שגררה את כל מעצמות אירופה למלחמה תוך שבועות.",
        "difficulty": 2,
        "quality_score": 8.5,
    },
    {
        "category": "טכנולוגיה",
        "question_text": "מה היה השם הפנימי של הפרוטוקול שהפך לבסיס האינטרנט המודרני, שפותח בפרויקט ARPANET?",
        "correct_answer": "TCP/IP — פרוטוקול השליטה בשידורים ופרוטוקול האינטרנט",
        "explanation": "TCP/IP פותח ב-1974 על ידי וינט קרף ובוב קאהן, והחליף את NCP ב-1983 כפרוטוקול הרשמי של ARPANET.",
        "difficulty": 4,
        "quality_score": 7.8,
    },
    {
        "category": "ספורט",
        "question_text": "כמה מדינות השתתפו באולימפיאדת אתונה 1896, המשחקים המודרניים הראשונים?",
        "correct_answer": "14 מדינות",
        "explanation": "241 ספורטאים מ-14 מדינות השתתפו ב-43 תחרויות. לשם השוואה, טוקיו 2020 הכילה 206 מדינות ו-11,000 ספורטאים.",
        "difficulty": 3,
        "quality_score": 7.5,
    },
    {
        "category": "מדע",
        "question_text": "כמה זוגות בסיסים מרכיבים את הגנום האנושי?",
        "correct_answer": "כ-3 מיליארד זוגות בסיסים",
        "explanation": "הגנום האנושי מכיל כ-3.2 מיליארד זוגות בסיסים של DNA המקודדים כ-20,000 גנים — פחות מזבוב הפרי שיש לו 14,000.",
        "difficulty": 3,
        "quality_score": 8.0,
    },
    {
        "category": "היסטוריה",
        "question_text": "מה היה המחיר הכלכלי של המהפכה הצרפתית? כמה אנשים מתו ב'טרור' לבדו?",
        "correct_answer": "כ-17,000 מוצאו להורג רשמית, ועד 40,000 מתו בכלא או ללא משפט",
        "explanation": "בין 1793 ל-1794 (שנת הטרור) נכלאו מעל 300,000 חשודים; הגיליוטינה הפכה לסמל הנקמה המהפכנית.",
        "difficulty": 4,
        "quality_score": 8.3,
    },
    {
        "category": "גיאוגרפיה",
        "question_text": "איזה ים מפריד בין ישראל לירדן בדרום?",
        "correct_answer": "מפרץ אילת (ים סוף)",
        "explanation": "מפרץ אילת הוא הזרוע הצפונית-מזרחית של ים סוף. גבול ישראל-ירדן עובר דרכו, כאשר אילת ועקבה שוכנות מול זו לזו.",
        "difficulty": 1,
        "quality_score": 6.9,
    },
    {
        "category": "ספרות",
        "question_text": "שייקספיר כתב את 'המלט' בהתבסס על אגדה סקנדינבית. מה שמו של הנסיך המקורי?",
        "correct_answer": "אמלת' (Amleth) — נסיך דני מ'גסטה דנורום' של סאקסו גרמטיקוס",
        "explanation": "בשנת 1200 לערך תיעד ההיסטוריון סאקסו גרמטיקוס את סיפור אמלת', נסיך שהעמיד פני משוגע כדי לנקום בדודו הרוצח.",
        "difficulty": 4,
        "quality_score": 8.7,
    },
    {
        "category": "כלכלה",
        "question_text": "מהי 'ידו הנעלמה' שדיבר עליה אדם סמית' ב'עושר העמים'?",
        "correct_answer": "המנגנון שבו חיפוש הרווח האישי מוביל, ללא כוונה, לתועלת חברתית כללית",
        "explanation": "סמית' השתמש בביטוי רק שלוש פעמים בכל כתביו, אך הוא הפך לסמל המרכזי של הכלכלה הקלסית החופשית.",
        "difficulty": 3,
        "quality_score": 7.6,
    },
    {
        "category": "מדע",
        "question_text": "מדוע שמיים כחולים ביום אך אדומים בשקיעה?",
        "correct_answer": "פיזור ריילי: אור כחול מתפזר יותר; בשקיעה האור עובר מסלול ארוך יותר ורק האדום שורד",
        "explanation": "גלי האור הכחולים הקצרים מתפזרים בכל הכיוונים על ידי מולקולות האוויר. בשקיעה, נתיב האור הארוך יותר מפזר את הכחול לפני שמגיע אלינו.",
        "difficulty": 3,
        "quality_score": 8.1,
    },
    {
        "category": "מוזיקה",
        "question_text": "מי הלחין את 'האי המחושמל' בשיתוף פעולה — צ'ייקובסקי, בטהובן, או מוצרט?",
        "correct_answer": "אף אחד — זוהי יצירה בדויה; השאלה בדיוק: מי מהם לא כתב סימפוניה מספר 10?",
        "explanation": "שאלה מתעתעת: בטהובן נפטר לפני שהשלים את הסימפוניה ה-10; מוצרט כתב 41; צ'ייקובסקי 6.",
        "difficulty": 5,
        "quality_score": 9.0,
    },
    {
        "category": "ביולוגיה",
        "question_text": "כמה אחוז מה-DNA שלנו זהה ל-DNA של שימפנזה?",
        "correct_answer": "כ-98.7 אחוז",
        "explanation": "ההבדל של 1.3% בלבד בא לידי ביטוי ב-35 מיליון שינויים בבסיס בודד ו-90 מיליון הכנסות/מחיקות, מה שיוצר הבדל עצום בקוגניציה.",
        "difficulty": 2,
        "quality_score": 7.9,
    },
    {
        "category": "פילוסופיה",
        "question_text": "מהי 'גיליוטינה של יום' — מושג שטבע הפילוסוף דיויד יום?",
        "correct_answer": "הטעות של הסקת 'מה שצריך להיות' מ'מה שהוא' — הסקת ערך מעובדה",
        "explanation": "יום טען שאי אפשר להסיק הצהרות נורמטיביות (מוסריות) מהצהרות עובדתיות בלבד — פער ה-is-ought המפורסם.",
        "difficulty": 5,
        "quality_score": 8.8,
    },
    {
        "category": "אמנות",
        "question_text": "לאונרדו דה וינצ'י הותיר מעט מאוד ציורים מוגמרים. כמה ציורים מיוחסים לו בוודאות?",
        "correct_answer": "כ-15–20 ציורים בלבד",
        "explanation": "למרות שהיה גאון פורה — אדריכלות, מוזיקה, הנדסה — דה וינצ'י עסק בציור לסירוגין. רק כ-17 ציורים מיוחסים לו בוודאות מחקרית.",
        "difficulty": 3,
        "quality_score": 8.0,
    },
    {
        "category": "פיזיקה",
        "question_text": "מה מהירות האור בוואקום, בקירוב?",
        "correct_answer": "299,792 קילומטר לשנייה (כ-300,000 קמ\"ש)",
        "explanation": "מהירות האור היא קבוע יסוד של הטבע, מסומנת c. היא גבול המהירות היקומי לפי תורת היחסיות.",
        "difficulty": 1,
        "quality_score": 6.5,
    },
    {
        "category": "כימיה",
        "question_text": "מהו החומר עם נקודת ההיתוך הגבוהה ביותר הידועה?",
        "correct_answer": "טונגסטן (וולפרם) — נמס ב-3,422 מעלות צלזיוס",
        "explanation": "טונגסטן (W) הוא המתכת עם נקודת ההיתוך הגבוהה ביותר, ולכן משמש לחוטי נורות ותעשיית חלל.",
        "difficulty": 3,
        "quality_score": 7.7,
    },
    {
        "category": "גיאוגרפיה",
        "question_text": "איזו מדינה בעולם מכילה את מספר האגמים הגדול ביותר?",
        "correct_answer": "קנדה — יותר מ-3 מיליון אגמים",
        "explanation": "קנדה מכילה כ-60% מכלל המים הכלואים באגמי העולם, כולל חלק ממשל מהאגמים הגדולים.",
        "difficulty": 3,
        "quality_score": 7.4,
    },
    {
        "category": "אסטרונומיה",
        "question_text": "כמה זמן אור השמש נוסע עד כדור הארץ?",
        "correct_answer": "כ-8 דקות ו-20 שניות",
        "explanation": "המרחק הממוצע בין כדור הארץ לשמש הוא כ-150 מיליון ק\"מ. בחלוקה למהירות האור (300,000 קמ\"ש) מתקבל כ-500 שניות.",
        "difficulty": 2,
        "quality_score": 7.2,
    },
    {
        "category": "היסטוריה",
        "question_text": "באיזה שנה הוקמה מדינת ישראל, ומה אירע באותה שנה בעולם?",
        "correct_answer": "1948 — גם הכרזת אל-נכבה, הברית האטלנטית הצפונית (נאט\"ו) הוקמה שנה לאחר מכן",
        "explanation": "1948 הייתה שנה מכוננת: ישראל הוכרזה ב-14 במאי, ובאותה שנה גם גנדי נרצח, ברלין הוקפה ומרשל-פלאן הועלה לאישרור.",
        "difficulty": 3,
        "quality_score": 8.4,
    },
    {
        "category": "מתמטיקה",
        "question_text": "מהו מספר פיבונאצ'י ה-10 בסדרה (מתחילים מ-1)?",
        "correct_answer": "55",
        "explanation": "סדרת פיבונאצ'י: 1,1,2,3,5,8,13,21,34,55. כל מספר הוא סכום שני קודמיו. המספר ה-10 הוא 55.",
        "difficulty": 2,
        "quality_score": 7.0,
    },
]


def seed_sample_data(db: sqlite3.Connection) -> None:
    """Seed sources and questions if the DB is fresh (no existing sources)."""
    count = db.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
    if count > 0:
        return  # already seeded

    for src in SAMPLE_SOURCES:
        db.execute(
            """INSERT OR IGNORE INTO sources (id, type, name, config, skill_id, status)
               VALUES (?, ?, ?, ?, ?, 'idle')""",
            (src["id"], src["type"], src["name"],
             json.dumps(src["config"]), src.get("skill_id")),
        )

    for q in SAMPLE_QUESTIONS:
        db.execute(
            """INSERT INTO questions
               (id, category, question_text, correct_answer, explanation,
                difficulty, quality_score, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'active')""",
            (str(uuid.uuid4()), q["category"], q["question_text"],
             q["correct_answer"], q.get("explanation", ""),
             q["difficulty"], q["quality_score"]),
        )

    db.commit()
