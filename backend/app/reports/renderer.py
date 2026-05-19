"""Render Jinja2 templates to PDF with WeasyPrint."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"


@lru_cache(maxsize=1)
def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


@lru_cache(maxsize=1)
def _stylesheet() -> str:
    return (_TEMPLATES_DIR / "styles.css").read_text(encoding="utf-8")


def render(template_name: str, context: dict[str, Any]) -> bytes:
    """Render the given template with `context` and return the PDF as bytes."""
    from weasyprint import HTML  # imported lazily so tests can collect without GTK present

    ctx = {**context, "stylesheet": _stylesheet()}
    html = _env().get_template(template_name).render(**ctx)
    return HTML(string=html, base_url=str(_TEMPLATES_DIR)).write_pdf()
