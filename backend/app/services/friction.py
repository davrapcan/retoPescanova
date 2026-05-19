"""Friction Score calculation per module×country cell."""
from typing import Optional
import pandas as pd

from app.config import (
    FRICTION_WEIGHT_DURATION,
    FRICTION_WEIGHT_INCOMPLETE,
    LOW_SAMPLE_THRESHOLD,
    P95_DURATION_GLOBAL_MIN,
)


def compute_friction(
    events: pd.DataFrame,
    p95_duration: float = P95_DURATION_GLOBAL_MIN,
) -> Optional[float]:
    """
    friction = 100 * (0.55 * duration_norm + 0.45 * incomplete_rate)
    Returns None if events is empty.
    """
    n = len(events)
    if n == 0:
        return None

    avg_duration = events["duration_min"].mean()
    duration_norm = min(avg_duration / p95_duration, 1.0)

    n_completed = events["completed_at"].notna().sum()
    incomplete_rate = (n - n_completed) / n

    friction = 100.0 * (
        FRICTION_WEIGHT_DURATION * duration_norm
        + FRICTION_WEIGHT_INCOMPLETE * incomplete_rate
    )
    return round(friction, 1)
