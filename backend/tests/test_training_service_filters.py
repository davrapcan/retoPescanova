import pandas as pd
import pytest

from app.services import training_service
from app.storage.memory import store


@pytest.fixture(autouse=True)
def _seed():
    store.training_events = pd.DataFrame([
        {"user_id": "U1", "module_name": "Phishing", "assignment_name": "Phishing Campaign",
         "location": "España", "started_at": pd.Timestamp("2026-05-01"),
         "completed_at": pd.Timestamp("2026-05-01"), "duration_min": 5},
        {"user_id": "U2", "module_name": "GDPR", "assignment_name": "GDPR Q2",
         "location": "España", "started_at": pd.Timestamp("2026-05-02"),
         "completed_at": None, "duration_min": 12},
        {"user_id": "U3", "module_name": "Phishing", "assignment_name": "Phishing Campaign",
         "location": "Francia", "started_at": pd.Timestamp("2026-05-03"),
         "completed_at": pd.Timestamp("2026-05-03"), "duration_min": 7},
    ])
    store.training_users = pd.DataFrame([
        {"user_id": "U1", "location": "España", "completion_rate": 1.0, "score_pct": 80.0,
         "total_duration_min": 5, "last_completion_at": pd.Timestamp("2026-05-01"),
         "modules_completed": 1, "modules_assigned": 1},
        {"user_id": "U2", "location": "España", "completion_rate": 0.0, "score_pct": 0.0,
         "total_duration_min": 12, "last_completion_at": None,
         "modules_completed": 0, "modules_assigned": 1},
        {"user_id": "U3", "location": "Francia", "completion_rate": 1.0, "score_pct": 60.0,
         "total_duration_min": 7, "last_completion_at": pd.Timestamp("2026-05-03"),
         "modules_completed": 1, "modules_assigned": 1},
    ])
    yield


def test_list_modules_returns_unique_assignments_sorted():
    result = training_service.list_modules()
    assert result == ["GDPR Q2", "Phishing Campaign"]


def test_kpis_filter_by_module_uses_assignment_name():
    result = training_service.get_kpis(module="Phishing Campaign")
    assert result.total_users == 2
    assert result.total_modules == 1
