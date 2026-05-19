"""Filters added for PDF reports — verify they narrow the result set correctly."""
import pandas as pd
import pytest

from app.services import mdm_service
from app.storage.memory import store


@pytest.fixture(autouse=True)
def _seed_store():
    store.mdm_devices = pd.DataFrame([
        {"computer_name": "PC1", "remote_office_raw": "VG España - Chapela (GLE)",
         "remote_office_code": "GLE", "patching_status": "Patching Completed",
         "last_deployment_at": pd.Timestamp("2026-05-12")},
        {"computer_name": "PC2", "remote_office_raw": "VG España - Porriño (TSV)",
         "remote_office_code": "TSV", "patching_status": "Patches Missing",
         "last_deployment_at": pd.Timestamp("2026-05-13")},
        {"computer_name": "PC3", "remote_office_raw": "VG España - Porriño (TSV)",
         "remote_office_code": "TSV", "patching_status": "Patching Failed",
         "last_deployment_at": pd.Timestamp("2026-05-13")},
    ])
    store.mdm_patches = pd.DataFrame([
        {"patch_id": 1, "bulletin_id": "MS-1", "description": "Edge",
         "missing_systems": 5, "installed_systems": 100, "failed_systems": 0, "risk_score": 5},
        {"patch_id": 2, "bulletin_id": "MS-2", "description": "Chrome",
         "missing_systems": 1, "installed_systems": 200, "failed_systems": 3, "risk_score": 7},
        {"patch_id": 3, "bulletin_id": "MS-3", "description": "Office",
         "missing_systems": 0, "installed_systems": 300, "failed_systems": 0, "risk_score": 0},
    ])
    store.mdm_events = pd.DataFrame(columns=["deployed_at", "deployment_status"])
    yield


def test_top_patches_filters_by_patch_id():
    result = mdm_service.get_top_patches(limit=10, patch_id="1,3")
    ids = {p.patch_id for p in result}
    assert ids == {1, 3}


def test_top_patches_no_filter_returns_all():
    result = mdm_service.get_top_patches(limit=10)
    assert len(result) == 3


def test_kpis_filter_by_office_code():
    result = mdm_service.get_kpis(office="TSV")
    assert result.total == 2
    assert result.missing == 1
    assert result.failed == 1
    assert result.completed == 0
