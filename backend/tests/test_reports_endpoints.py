import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.storage.memory import store

client = TestClient(app)


@pytest.fixture
def seeded():
    store.mdm_devices = pd.DataFrame([
        {"computer_name": "PC1", "remote_office_raw": "VG España - Chapela (GLE)",
         "remote_office_code": "GLE", "patching_status": "Patching Completed",
         "last_deployment_at": pd.Timestamp("2026-05-12")},
    ])
    store.mdm_patches = pd.DataFrame([
        {"patch_id": 1, "bulletin_id": "MS-1", "description": "Edge",
         "missing_systems": 0, "installed_systems": 1, "failed_systems": 0, "risk_score": 0},
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
    store.mdm_devices = None
    store.mdm_patches = None
    store.mdm_events = None
    store.training_events = None
    store.training_users = None


def _weasyprint_native_libs_present() -> bool:
    try:
        import weasyprint  # noqa: F401
        return True
    except OSError:
        return False


WEASYPRINT_AVAILABLE = _weasyprint_native_libs_present()


@pytest.mark.skipif(not WEASYPRINT_AVAILABLE, reason="WeasyPrint native libs (GTK/Pango/Cairo) not installed on this host")
def test_mdm_report_returns_pdf(seeded):
    r = client.get("/api/v1/reports/mdm.pdf?office=GLE")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.headers["content-disposition"].startswith("inline; filename=")
    assert r.content.startswith(b"%PDF")
    assert len(r.content) > 1000


@pytest.mark.skipif(not WEASYPRINT_AVAILABLE, reason="WeasyPrint native libs (GTK/Pango/Cairo) not installed on this host")
def test_training_report_returns_pdf(seeded):
    r = client.get("/api/v1/reports/training.pdf?location=España")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_mdm_report_503_when_not_loaded():
    # Defensive: clear any state leaked from sibling test modules that don't tear down.
    store.mdm_events = None
    store.mdm_devices = None
    store.mdm_patches = None
    r = client.get("/api/v1/reports/mdm.pdf")
    assert r.status_code == 503


def test_mdm_report_422_on_bad_date(seeded):
    r = client.get("/api/v1/reports/mdm.pdf?date_from=11/05/2026")
    assert r.status_code == 422
