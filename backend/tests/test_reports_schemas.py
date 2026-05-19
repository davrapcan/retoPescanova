import pytest
from pydantic import ValidationError

from app.reports.schemas import MDMReportFilters, TrainingReportFilters


def test_mdm_filters_accept_iso_dates():
    f = MDMReportFilters(date_from="2026-05-11", date_to="2026-05-18")
    assert f.date_from == "2026-05-11"


def test_mdm_filters_reject_bad_date():
    with pytest.raises(ValidationError):
        MDMReportFilters(date_from="11/05/2026")


def test_mdm_filters_default_empty():
    f = MDMReportFilters()
    assert f.date_from is None
    assert f.patch_id is None
    assert f.office is None


def test_training_filters_default_empty():
    f = TrainingReportFilters()
    assert f.location is None
    assert f.module is None
