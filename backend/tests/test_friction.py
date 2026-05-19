import pandas as pd
from app.services.friction import compute_friction


def _make_events(durations: list[float], completeds: list[bool]) -> pd.DataFrame:
    return pd.DataFrame({
        "duration_min": durations,
        "completed_at": [pd.Timestamp("2026-01-01") if c else pd.NaT for c in completeds],
    })


def test_empty_returns_none():
    assert compute_friction(pd.DataFrame({"duration_min": [], "completed_at": []})) is None


def test_fast_complete_low_friction():
    # All complete in 1 min each, p95=13 → duration_norm=1/13≈0.077, incomplete=0
    # friction = 100 * (0.55 * 0.077 + 0.45 * 0) ≈ 4.2
    events = _make_events([1.0] * 10, [True] * 10)
    score = compute_friction(events)
    assert score is not None
    assert score < 30


def test_nobody_completes_approx_45():
    # All assigned, none complete, avg_duration=1 → duration_norm=1/13≈0.077
    # incomplete_rate = 1.0
    # friction = 100 * (0.55 * 0.077 + 0.45 * 1.0) = 100 * (0.042 + 0.45) = 49.2
    events = _make_events([1.0] * 10, [False] * 10)
    score = compute_friction(events)
    assert score is not None
    # incomplete_rate = 1.0 → contributes 0.45 * 100 = 45 minimum
    assert score >= 40


def test_score_between_0_and_100():
    events = _make_events([5.0, 10.0, 15.0], [True, False, True])
    score = compute_friction(events)
    assert score is not None
    assert 0.0 <= score <= 100.0
