import pandas as pd
import pytest

from app.reports.context import build_mdm_context, build_training_context
from app.reports.schemas import MDMReportFilters, TrainingReportFilters
from app.storage.memory import store


@pytest.fixture(autouse=True)
def _seed():
    store.mdm_devices = pd.DataFrame([
        {"computer_name": "PC1", "remote_office_raw": "VG España - Chapela (GLE)",
         "remote_office_code": "GLE", "patching_status": "Patching Completed",
         "last_deployment_at": pd.Timestamp("2026-05-12")},
        {"computer_name": "PC2", "remote_office_raw": "VG España - Porriño (TSV)",
         "remote_office_code": "TSV", "patching_status": "Patches Missing",
         "last_deployment_at": pd.Timestamp("2026-05-13")},
    ])
    store.mdm_patches = pd.DataFrame([
        {"patch_id": 1, "bulletin_id": "MS-1", "description": "Edge",
         "missing_systems": 5, "installed_systems": 100, "failed_systems": 0, "risk_score": 5},
    ])
    store.mdm_events = pd.DataFrame(columns=["deployed_at", "deployment_status"])

    store.training_events = pd.DataFrame([
        {"user_id": "U1", "module_name": "Phishing", "assignment_name": "Phishing Q2",
         "location": "España", "started_at": pd.Timestamp("2026-05-01"),
         "completed_at": pd.Timestamp("2026-05-01"), "duration_min": 5},
    ])
    store.training_users = pd.DataFrame([
        {"user_id": "U1", "location": "España", "completion_rate": 1.0, "score_pct": 80.0,
         "total_duration_min": 5, "last_completion_at": pd.Timestamp("2026-05-01"),
         "modules_completed": 1, "modules_assigned": 1},
    ])
    yield


def test_mdm_context_contains_required_keys():
    ctx = build_mdm_context(MDMReportFilters(office="GLE"))
    assert ctx["title"] == "Informe MDM · Parches"
    assert ctx["kpis"]["total"] == 1
    assert any(c["label"] == "Oficinas" for c in ctx["filter_chips"])
    assert ctx["banner"]["severity"] in {"ok", "warning", "critical"}
    assert isinstance(ctx["top_patches"], list)
    assert isinstance(ctx["offices"], list)


def test_training_context_contains_required_keys():
    ctx = build_training_context(TrainingReportFilters(location="España"))
    assert ctx["title"] == "Informe Formación"
    assert ctx["kpis"]["total_users"] == 1
    assert any(c["label"] == "Países" for c in ctx["filter_chips"])
    assert isinstance(ctx["countries"], list)
    assert isinstance(ctx["outliers"], list)
