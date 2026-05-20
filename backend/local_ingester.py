"""Ingest local PDF/TXT files from LOCAL_DOCS_DIR."""
import os
import pathlib

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

DOCS_DIR = os.getenv('LOCAL_DOCS_DIR', './local_docs')


def _read_pdf(path: pathlib.Path) -> str:
    if not HAS_PYMUPDF:
        return ''
    doc = fitz.open(str(path))
    return '\n'.join(page.get_text() for page in doc)[:8000]


def _read_txt(path: pathlib.Path) -> str:
    return path.read_text(encoding='utf-8', errors='ignore')[:8000]


def load_local_docs() -> list[dict]:
    docs_path = pathlib.Path(DOCS_DIR)
    if not docs_path.exists():
        return []

    results = []
    for f in docs_path.iterdir():
        if f.suffix.lower() == '.pdf':
            text = _read_pdf(f)
        elif f.suffix.lower() in ('.txt', '.md'):
            text = _read_txt(f)
        else:
            continue
        if text.strip():
            results.append({
                'category': 'מקור מקומי',
                'title': f.stem,
                'text': text,
                'url': f.as_uri(),
            })
    return results
