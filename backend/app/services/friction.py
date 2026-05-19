"""Friction Score calculation — stub, to be implemented in C1."""
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
    Returns None if no events (empty cell).
    """
    raise NotImplementedError
