import pytest

from app.reports import renderer


@pytest.fixture(scope="module")
def _weasyprint_available() -> bool:
    """Skip renderer tests when WeasyPrint's native libs (GTK/Pango/Cairo) are missing.

    Native libs are present in the backend Docker image and on Linux/macOS, but
    on a vanilla Windows host they require an extra GTK3 runtime install.
    """
    try:
        import weasyprint  # noqa: F401
    except OSError as exc:
        pytest.skip(f"WeasyPrint native libs not available on this host: {exc}")
    return True


def test_render_returns_pdf_bytes(_weasyprint_available):
    pdf = renderer.render(
        "base.html",
        {
            "title": "Demo",
            "subtitle": "Just a test",
            "filter_chips": [{"label": "X", "value": "1"}],
            "kpis": [],
            "banner": None,
            "emitted_at_human": "2026-05-19 10:00",
            "filters_summary": "ninguno",
        },
    )
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000
