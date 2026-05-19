"""Pydantic models that validate query-string filters for PDF reports."""
from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, field_validator

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class _BaseFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None

    @field_validator("date_from", "date_to")
    @classmethod
    def _check_iso(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if not _ISO_DATE_RE.match(value):
            raise ValueError("Date must be ISO 8601 (YYYY-MM-DD)")
        return value


class MDMReportFilters(_BaseFilters):
    patch_id: Optional[str] = None
    office: Optional[str] = None


class TrainingReportFilters(_BaseFilters):
    location: Optional[str] = None
    module: Optional[str] = None
