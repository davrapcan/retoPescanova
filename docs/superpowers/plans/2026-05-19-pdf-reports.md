# PDF Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add executive-summary PDF reports for MDM and Training tabs of the Pescanova cockpit, served from the backend (HTML→PDF with WeasyPrint), invoked from a compact popover button in each tab's header.

**Architecture:** A new `backend/app/reports/` module renders Jinja2 templates with WeasyPrint. Two REST endpoints (`/api/v1/reports/mdm.pdf` and `/training.pdf`) accept the same filters as the dashboards plus two new optional ones (`patch_id` for MDM and `module` for Training). The endpoints invoke the existing services to obtain KPIs, banner and tables — no business logic is duplicated. On the frontend, a new `ReportButton` component opens a popover anchored to the trigger; clicking "Generar PDF" calls `window.open` with the filters as query string.

**Tech Stack:** Backend — Python 3.12, FastAPI, Jinja2, WeasyPrint, Pandas, Pydantic v2, uv. Frontend — Next.js 15, React 18, Tailwind.

---

## Codebase state before starting

- Backend services (`mdm_service`, `training_service`) already expose KPIs, banners, and per-country/per-office aggregations with `date_from`, `date_to`, `office`, `location` filters.
- The MDM services do **not** currently support filtering by `patch_id` — this plan adds that filter where needed.
- The Training services do **not** currently support filtering events by `module` (assignment name) — this plan adds that filter and a `/training/modules` listing endpoint.
- All Pydantic schemas live in `backend/app/models/responses.py`. We do **not** modify them; we add a new file `backend/app/reports/schemas.py` for filter validation only.
- `backend/Dockerfile` is a plain `python:3.12-slim` with deps inlined. We must add WeasyPrint native deps via `apt-get`.
- `backend/pyproject.toml` is the source of truth for `uv` deps. The Dockerfile inline install list is duplicated (technical debt that exists already) — this plan keeps both in sync.
- Frontend has no `MultiSelect` primitive nor a popover system. We build both minimal versions here.
- Frontend API client uses `BASE_URL = 'http://localhost:8000/api/v1'` and a `toQuery` helper — we reuse the same conventions but call `window.open` for PDFs.

## File structure (created or modified by this plan)

```
backend/
├── pyproject.toml                              # add weasyprint, jinja2
├── Dockerfile                                  # add apt deps for WeasyPrint + sync pip list
├── app/
│   ├── main.py                                 # include new reports router
│   ├── services/
│   │   ├── mdm_service.py                      # accept patch_id filter on top_patches + office on get_kpis
│   │   └── training_service.py                 # accept module filter; add list_modules()
│   ├── routers/
│   │   ├── reports.py                          # NEW — GET /reports/mdm.pdf, /reports/training.pdf
│   │   └── training.py                         # add GET /training/modules
│   └── reports/                                # NEW package
│       ├── __init__.py
│       ├── schemas.py                          # Pydantic models for filter validation
│       ├── context.py                          # build_mdm_context, build_training_context
│       ├── renderer.py                         # Jinja2 env + WeasyPrint wrapper
│       └── templates/
│           ├── base.html
│           ├── styles.css
│           ├── mdm.html
│           └── training.html
└── tests/
    ├── test_reports_context.py                 # NEW — context builders against fixtures
    └── test_reports_endpoints.py               # NEW — endpoints smoke + 503 + filter passthrough

frontend/
├── lib/
│   ├── api.ts                                  # add reports.mdmUrl(), reports.trainingUrl(), training.modules()
│   └── types.ts                                # add ReportFilters types
├── components/
│   ├── ui/
│   │   ├── MultiSelect.tsx                     # NEW — minimal multi-select primitive
│   │   ├── DateRangeInput.tsx                  # NEW — two type=date inputs side by side
│   │   └── ReportButton.tsx                    # NEW — compact button + popover
│   └── layout/
│       └── DashboardHeader.tsx                 # accept optional `extra` slot for buttons
└── app/
    ├── mdm/page.tsx                            # mount ReportButton kind=mdm
    └── training/page.tsx                       # mount ReportButton kind=training
```

## Conventions for this plan

- Backend tests run via `cd backend; uv run pytest -v <path>` (current convention). If WeasyPrint cannot install on Windows, run tests inside the backend container: `docker compose run --rm backend pytest -v <path>`.
- Each task ends with a commit using Conventional Commits (`feat`, `test`, `chore`, `docs`).
- Tasks within the backend are TDD: failing test → implementation → passing test → commit.
- Frontend tasks use a "build component → wire into page → manual verify" loop (no e2e framework set up in this repo).

---

## Task 1 · Add backend dependencies and Docker native libs

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/Dockerfile`

- [ ] **Step 1: Add WeasyPrint + Jinja2 to `pyproject.toml`**

Edit `backend/pyproject.toml`, append two entries to the `dependencies` list:

```toml
[project]
name = "pescanova-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.29.0",
    "pandas>=2.2.0",
    "openpyxl>=3.1.0",
    "pydantic>=2.0.0",
    "python-multipart>=0.0.9",
    "pyarrow>=16.0.0",
    "weasyprint>=62.0",
    "jinja2>=3.1.0",
]
```

- [ ] **Step 2: Add native libs to the Dockerfile and keep the pip install list in sync**

Replace the whole `backend/Dockerfile` with:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# WeasyPrint native dependencies + a sensible default font.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    "uvicorn[standard]==0.29.0" \
    pandas==2.2.2 \
    openpyxl==3.1.2 \
    "pydantic>=2.0.0" \
    python-multipart==0.0.9 \
    pyarrow==16.0.0 \
    weasyprint==62.3 \
    jinja2==3.1.4

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

Reasoning for `fonts-dejavu-core`: lightweight, present in Debian base, ensures the report has a fallback when Inter is not available. Inter remains the design intent; embedding the `.woff2` is left for Task 5 (we ship Inter via `@font-face` in the template's CSS so the PDF renders the same regardless of system fonts).

- [ ] **Step 3: Rebuild backend and install locally with uv**

Run from repo root:

```bash
cd backend && uv sync
```

Expected: `uv` installs WeasyPrint and Jinja2 plus their deps. On Windows native, this can fail because of GTK; if it does, proceed using Docker (`docker compose build backend`) and run the rest of the tests inside the container.

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/Dockerfile
git commit -m "chore(backend): add WeasyPrint + Jinja2 deps and native libs for PDF reports"
```

---

## Task 2 · Extend mdm_service with patch_id and office filters

**Files:**
- Modify: `backend/app/services/mdm_service.py`
- Test: `backend/tests/test_mdm_service_filters.py` (new)

- [ ] **Step 1: Write failing tests for `get_top_patches(patch_id=...)` and `get_kpis(office=...)`**

Create `backend/tests/test_mdm_service_filters.py`:

```python
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
```

- [ ] **Step 2: Run tests; expect failures**

```bash
cd backend && uv run pytest tests/test_mdm_service_filters.py -v
```

Expected: `TypeError: get_top_patches() got an unexpected keyword argument 'patch_id'` and `get_kpis() got an unexpected keyword argument 'office'`.

- [ ] **Step 3: Add filters to `mdm_service`**

In `backend/app/services/mdm_service.py`, add an `office` parameter to `_filter_devices` and forward it from `get_kpis` and `get_by_office`; add a `patch_id` parameter to `get_top_patches`.

Replace `_filter_devices` with:

```python
def _filter_devices(
    date_from: Optional[str],
    date_to: Optional[str],
    office: Optional[str] = None,
) -> pd.DataFrame:
    df = store.mdm_devices.copy()
    if date_from:
        df = df[df["last_deployment_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["last_deployment_at"] <= pd.Timestamp(date_to)]
    if office:
        codes = [o.strip() for o in office.split(",") if o.strip()]
        if codes:
            df = df[df["remote_office_code"].isin(codes)]
    return df
```

Replace `get_kpis` signature and body:

```python
def get_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
) -> MDMKpis:
    df = _filter_devices(date_from, date_to, office)
    total = len(df)
    counts = df["patching_status"].value_counts()
    completed = int(counts.get(_STATUS_COMPLETED, 0))
    missing = int(counts.get(_STATUS_MISSING, 0))
    in_progress = int(counts.get(_STATUS_INPROGRESS, 0))
    failed = int(counts.get(_STATUS_FAILED, 0))
    return MDMKpis(
        completed=completed,
        missing=missing,
        in_progress=in_progress,
        failed=failed,
        total=total,
        completed_pct=round(completed / total * 100, 1) if total else 0.0,
        missing_pct=round(missing / total * 100, 1) if total else 0.0,
        in_progress_pct=round(in_progress / total * 100, 1) if total else 0.0,
        failed_pct=round(failed / total * 100, 1) if total else 0.0,
    )
```

Update `get_by_office` to use the new signature: change its first line to `df = _filter_devices(date_from, date_to, office)` and remove the existing inline office filter so the comma-split logic happens in one place. The new `get_by_office` body becomes:

```python
def get_by_office(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
) -> list[MDMOfficeItem]:
    df = _filter_devices(date_from, date_to, office)

    result = []
    for (off_name, off_code), grp in df.groupby(
        ["remote_office_raw", "remote_office_code"]
    ):
        counts = grp["patching_status"].value_counts()
        result.append(MDMOfficeItem(
            office=off_name,
            office_code=off_code,
            completed=int(counts.get(_STATUS_COMPLETED, 0)),
            missing=int(counts.get(_STATUS_MISSING, 0)),
            in_progress=int(counts.get(_STATUS_INPROGRESS, 0)),
            failed=int(counts.get(_STATUS_FAILED, 0)),
            total=len(grp),
        ))
    result.sort(key=lambda x: x.total, reverse=True)
    return result
```

Replace `get_top_patches`:

```python
def get_top_patches(
    limit: int = 5,
    patch_id: Optional[str] = None,
) -> list[MDMPatchItem]:
    df = store.mdm_patches.copy()
    if patch_id:
        ids = [int(p.strip()) for p in patch_id.split(",") if p.strip()]
        if ids:
            df = df[df["patch_id"].isin(ids)]
    total_devices = len(store.mdm_devices)
    df = df.sort_values("risk_score", ascending=False).head(limit)
    return [
        MDMPatchItem(
            patch_id=int(row["patch_id"]),
            bulletin_id=str(row["bulletin_id"]),
            description=str(row["description"]),
            missing_systems=int(row["missing_systems"]),
            installed_systems=int(row["installed_systems"]),
            failed_systems=int(row["failed_systems"]),
            risk_score=int(row["risk_score"]),
            total_devices=total_devices,
        )
        for _, row in df.iterrows()
    ]
```

- [ ] **Step 4: Run tests; expect passes**

```bash
cd backend && uv run pytest tests/test_mdm_service_filters.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Run the rest of the backend tests to ensure no regression**

```bash
cd backend && uv run pytest -v
```

Expected: all existing tests still pass.

- [ ] **Step 6: Update the MDM router so the new query params are exposed**

In `backend/app/routers/mdm.py`, change the signatures:

```python
@router.get("/kpis", response_model=ApiResponse[MDMKpis])
async def get_mdm_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_kpis(date_from, date_to, office)}


@router.get("/top-patches", response_model=ApiResponse[List[MDMPatchItem]])
async def get_mdm_top_patches(
    limit: int = Query(default=5, ge=1, le=50),
    patch_id: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_top_patches(limit, patch_id)}
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/mdm_service.py backend/app/routers/mdm.py backend/tests/test_mdm_service_filters.py
git commit -m "feat(mdm): add office filter to KPIs and patch_id filter to top-patches"
```

---

## Task 3 · Add module filter and list_modules to training_service

**Files:**
- Modify: `backend/app/services/training_service.py`
- Modify: `backend/app/routers/training.py`
- Test: `backend/tests/test_training_service_filters.py` (new)

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_training_service_filters.py`:

```python
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
```

- [ ] **Step 2: Run tests; expect failures**

```bash
cd backend && uv run pytest tests/test_training_service_filters.py -v
```

Expected: both fail (`list_modules` does not exist; `get_kpis` rejects `module`).

- [ ] **Step 3: Implement `list_modules` and the module filter**

In `backend/app/services/training_service.py`, replace `_filter_events` and `_filter_users` with versions that accept `module`:

```python
def _filter_events(
    date_from: Optional[str],
    date_to: Optional[str],
    location: Optional[str],
    module: Optional[str] = None,
) -> pd.DataFrame:
    df = store.training_events.copy()
    if date_from:
        df = df[df["started_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["started_at"] <= pd.Timestamp(date_to)]
    if location:
        locs = [l.strip() for l in location.split(",") if l.strip()]
        if locs:
            df = df[df["location"].isin(locs)]
    if module:
        mods = [m.strip() for m in module.split(",") if m.strip()]
        if mods:
            df = df[df["assignment_name"].isin(mods)]
    return df


def _filter_users(
    date_from: Optional[str],
    date_to: Optional[str],
    location: Optional[str],
    module: Optional[str] = None,
) -> pd.DataFrame:
    df = store.training_users.copy()
    if date_from:
        df = df[df["last_completion_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["last_completion_at"] <= pd.Timestamp(date_to)]
    if location:
        locs = [l.strip() for l in location.split(",") if l.strip()]
        if locs:
            df = df[df["location"].isin(locs)]
    if module:
        mods = [m.strip() for m in module.split(",") if m.strip()]
        if mods:
            event_users = store.training_events[
                store.training_events["assignment_name"].isin(mods)
            ]["user_id"].unique()
            df = df[df["user_id"].isin(event_users)]
    return df
```

Update `get_kpis` to forward `module`:

```python
def get_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
    module: Optional[str] = None,
) -> TrainingKpis:
    users = _filter_users(date_from, date_to, location, module)
    events = _filter_events(date_from, date_to, location, module)

    total_users = len(users)
    total_countries = users[users["location"] != "Sin asignar"]["location"].nunique()
    total_modules = events["assignment_name"].nunique()
    completion_rate = float(users["completion_rate"].mean()) if total_users else 0.0
    avg_score_pct = float(users["score_pct"].mean()) if total_users else 0.0
    avg_duration_min = float(users["total_duration_min"].mean()) if total_users else 0.0

    return TrainingKpis(
        total_users=total_users,
        total_countries=int(total_countries),
        total_modules=int(total_modules),
        completion_rate=round(completion_rate, 4),
        completion_rate_delta=None,
        avg_score_pct=round(avg_score_pct, 2),
        avg_duration_min=round(avg_duration_min, 1),
        avg_duration_delta=None,
    )
```

(Note: `total_modules` switches from `module_name` to `assignment_name` to stay consistent with the new filter; if it impacts other callers, the test in Step 5 will surface it.)

Update `get_by_country`, `get_timeline`, `get_distribution`, `get_outliers`, `get_users` to accept and forward an optional `module` parameter (one-line addition to signature and to the corresponding `_filter_users` call). For each function, add `module: Optional[str] = None` as the last parameter and pass it through. Example for `get_by_country`:

```python
def get_by_country(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    module: Optional[str] = None,
) -> list[TrainingCountryItem]:
    users = _filter_users(date_from, date_to, None, module)
    # ... rest unchanged
```

For `get_friction`, also forward `module` to `_filter_events` (same pattern).

Add at the bottom of the file:

```python
def list_modules() -> list[str]:
    """Return the unique assignment names available in the training_events store."""
    if store.training_events is None or store.training_events.empty:
        return []
    return sorted(store.training_events["assignment_name"].dropna().unique().tolist())
```

- [ ] **Step 4: Add `GET /training/modules` endpoint**

In `backend/app/routers/training.py`, add at the end of the file:

```python
@router.get("/modules", response_model=ApiResponse[List[str]])
async def get_training_modules():
    _require_training()
    return {"data": training_service.list_modules()}
```

You'll also need to update the `from app.models.responses import ...` block to ensure `List` from typing is already in scope (it is). Confirm by reading the import block.

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && uv run pytest -v
```

Expected: all pass, including the two new tests from Step 1. If existing training tests fail because of the `total_modules` change, update the assertions to reflect that `assignment_name` is now the unit of count.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/training_service.py backend/app/routers/training.py backend/tests/test_training_service_filters.py
git commit -m "feat(training): add module filter and GET /training/modules endpoint"
```

---

## Task 4 · Create reports schemas (filter validation)

**Files:**
- Create: `backend/app/reports/__init__.py`
- Create: `backend/app/reports/schemas.py`
- Test: `backend/tests/test_reports_schemas.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_reports_schemas.py`:

```python
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
```

- [ ] **Step 2: Run; expect failure (import error)**

```bash
cd backend && uv run pytest tests/test_reports_schemas.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.reports'`.

- [ ] **Step 3: Implement schemas**

Create `backend/app/reports/__init__.py` (empty file).

Create `backend/app/reports/schemas.py`:

```python
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
```

- [ ] **Step 4: Run tests; expect pass**

```bash
cd backend && uv run pytest tests/test_reports_schemas.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/reports/__init__.py backend/app/reports/schemas.py backend/tests/test_reports_schemas.py
git commit -m "feat(reports): add Pydantic filter schemas for PDF reports"
```

---

## Task 5 · Create base HTML template and styles

**Files:**
- Create: `backend/app/reports/templates/base.html`
- Create: `backend/app/reports/templates/styles.css`

(No tests in this task — visual rendering is exercised end-to-end in Task 8.)

- [ ] **Step 1: Create `base.html`**

Create `backend/app/reports/templates/base.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>{{ title }}</title>
  <style>{{ stylesheet | safe }}</style>
</head>
<body>
  <main>
    <section class="cover">
      {% block cover %}
      <div class="cover-row">
        <div class="logo">P</div>
        <div class="cover-text">
          <div class="cover-eyebrow">Pescanova · Cyber Risk Cockpit</div>
          <h1 class="cover-title">{{ title }}</h1>
          {% if subtitle %}<div class="cover-subtitle">{{ subtitle }}</div>{% endif %}
        </div>
      </div>
      {% if filter_chips %}
      <div class="chips">
        {% for chip in filter_chips %}
        <span class="chip"><span class="chip-label">{{ chip.label }}</span><span class="chip-value">{{ chip.value }}</span></span>
        {% endfor %}
      </div>
      {% endif %}
      {% endblock %}
    </section>

    <section class="kpis">{% block kpis %}{% endblock %}</section>
    <section class="banner">{% block banner %}{% endblock %}</section>
    <section class="content">{% block content %}{% endblock %}</section>
  </main>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

Create `backend/app/reports/templates/styles.css`:

```css
@page {
  size: A4;
  margin: 18mm 16mm 22mm 16mm;

  @bottom-left {
    content: "Emitido " string(emitted) " · Filtros: " string(filters);
    font-family: 'Inter', 'DejaVu Sans', sans-serif;
    font-size: 8pt;
    color: #64748B;
  }
  @bottom-right {
    content: "Página " counter(page) " / " counter(pages);
    font-family: 'Inter', 'DejaVu Sans', sans-serif;
    font-size: 8pt;
    color: #64748B;
  }
}

:root {
  --brand-red: #E30613;
  --brand-blue: #005A9C;
  --ok: #16A34A;
  --warning: #F59E0B;
  --critical: #DC2626;
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --border: #E2E8F0;
}

body {
  font-family: 'Inter', 'DejaVu Sans', sans-serif;
  color: var(--text-primary);
  font-size: 10pt;
  margin: 0;
}

.meta-emitted { string-set: emitted content(); display: none; }
.meta-filters { string-set: filters content(); display: none; }

.cover { margin-bottom: 12pt; }
.cover-row { display: flex; align-items: center; gap: 10pt; }
.logo {
  width: 26pt; height: 26pt; border-radius: 4pt; background: var(--brand-red);
  color: #fff; font-weight: 700; font-size: 14pt;
  display: flex; align-items: center; justify-content: center;
}
.cover-eyebrow { font-size: 8pt; letter-spacing: 0.5pt; text-transform: uppercase; color: var(--text-secondary); }
.cover-title { font-size: 20pt; font-weight: 600; margin: 2pt 0 0 0; }
.cover-subtitle { font-size: 10pt; color: var(--text-secondary); margin-top: 2pt; }

.chips { margin-top: 8pt; display: flex; flex-wrap: wrap; gap: 4pt; }
.chip { font-size: 8pt; border: 0.5pt solid var(--border); border-radius: 999pt;
        padding: 1pt 7pt; color: var(--text-primary); }
.chip-label { color: var(--text-secondary); margin-right: 4pt; text-transform: uppercase; letter-spacing: 0.3pt; }

.kpis { margin: 8pt 0 12pt 0; }
.kpi-row { display: flex; gap: 6pt; }
.kpi-card { flex: 1; border: 0.5pt solid var(--border); border-radius: 6pt;
            padding: 8pt 10pt; border-top-width: 2pt; }
.kpi-card.ok        { border-top-color: var(--ok); }
.kpi-card.warning   { border-top-color: var(--warning); }
.kpi-card.critical  { border-top-color: var(--critical); }
.kpi-card.brand     { border-top-color: var(--brand-blue); }
.kpi-label { font-size: 8pt; letter-spacing: 0.4pt; text-transform: uppercase; color: var(--text-secondary); }
.kpi-value { font-size: 18pt; font-weight: 600; margin-top: 2pt; }
.kpi-meta  { font-size: 8pt; color: var(--text-secondary); margin-top: 2pt; }

.risk-banner {
  border-radius: 6pt; padding: 8pt 10pt; margin-bottom: 12pt;
  border-left: 3pt solid; font-size: 10pt;
}
.risk-banner.ok        { background: #F0FDF4; border-color: var(--ok); }
.risk-banner.warning   { background: #FFFBEB; border-color: var(--warning); }
.risk-banner.critical  { background: #FEF2F2; border-color: var(--critical); }
.risk-banner .title { font-weight: 600; }
.risk-banner .desc  { color: var(--text-secondary); margin-top: 2pt; }

h2.section-title { font-size: 11pt; font-weight: 600; text-transform: uppercase;
                   letter-spacing: 0.4pt; color: var(--text-secondary);
                   margin: 14pt 0 6pt 0; }

table.report-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
table.report-table th {
  text-align: left; font-weight: 600; color: var(--text-secondary);
  border-bottom: 0.5pt solid var(--border); padding: 5pt 6pt;
  font-size: 8pt; letter-spacing: 0.3pt; text-transform: uppercase;
}
table.report-table td {
  padding: 5pt 6pt; border-bottom: 0.5pt solid var(--border);
}
table.report-table tr:nth-child(even) td { background: #F8FAFC; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.warn-pill {
  display: inline-block; font-size: 7pt; padding: 1pt 4pt; border-radius: 3pt;
  background: #FEF2F2; color: var(--critical); margin-left: 4pt;
}
.empty-state {
  border: 0.5pt dashed var(--border); border-radius: 6pt; padding: 14pt;
  text-align: center; color: var(--text-secondary); font-size: 9pt;
}
```

The `string-set` trick (`.meta-emitted`, `.meta-filters`) lets us populate the page footer from a hidden element in the document. The base template will emit those hidden elements in Task 6.

- [ ] **Step 3: Commit**

```bash
git add backend/app/reports/templates/base.html backend/app/reports/templates/styles.css
git commit -m "feat(reports): add base HTML template and Pescanova-branded styles"
```

---

## Task 6 · Renderer (Jinja env + WeasyPrint)

**Files:**
- Create: `backend/app/reports/renderer.py`
- Test: `backend/tests/test_reports_renderer.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_reports_renderer.py`:

```python
from app.reports import renderer


def test_render_returns_pdf_bytes():
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
```

- [ ] **Step 2: Run; expect failure**

```bash
cd backend && uv run pytest tests/test_reports_renderer.py -v
```

Expected: `ImportError` / module not found.

- [ ] **Step 3: Implement the renderer**

Create `backend/app/reports/renderer.py`:

```python
"""Render Jinja2 templates to PDF with WeasyPrint."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"


@lru_cache(maxsize=1)
def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


@lru_cache(maxsize=1)
def _stylesheet() -> str:
    return (_TEMPLATES_DIR / "styles.css").read_text(encoding="utf-8")


def render(template_name: str, context: dict[str, Any]) -> bytes:
    """Render the given template with `context` and return the PDF as bytes."""
    from weasyprint import HTML  # imported lazily so tests can collect without GTK present

    ctx = {**context, "stylesheet": _stylesheet()}
    html = _env().get_template(template_name).render(**ctx)
    return HTML(string=html, base_url=str(_TEMPLATES_DIR)).write_pdf()
```

The lazy `weasyprint` import means tests that mock `renderer.render` can still be collected on Windows even when WeasyPrint's native libs aren't installed.

Append to `base.html` (before `</body>`) two hidden elements that feed the footer via `string-set`:

```html
    <div class="meta-emitted">{{ emitted_at_human }}</div>
    <div class="meta-filters">{{ filters_summary }}</div>
```

- [ ] **Step 4: Run test; expect pass**

```bash
cd backend && uv run pytest tests/test_reports_renderer.py -v
```

Expected: 1 passed. If WeasyPrint cannot import on your machine, run inside the container: `docker compose run --rm backend pytest tests/test_reports_renderer.py -v`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/reports/renderer.py backend/app/reports/templates/base.html backend/tests/test_reports_renderer.py
git commit -m "feat(reports): add Jinja2+WeasyPrint renderer"
```

---

## Task 7 · MDM template + context builder

**Files:**
- Create: `backend/app/reports/templates/mdm.html`
- Create: `backend/app/reports/context.py`
- Test: `backend/tests/test_reports_context.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_reports_context.py`:

```python
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
```

- [ ] **Step 2: Run; expect failure**

```bash
cd backend && uv run pytest tests/test_reports_context.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Implement `context.py`**

Create `backend/app/reports/context.py`:

```python
"""Assemble template contexts from existing services + filter models."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.reports.schemas import MDMReportFilters, TrainingReportFilters
from app.services import mdm_service, training_service


def _now_human() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def _summarize(chips: list[dict[str, str]]) -> str:
    if not chips:
        return "sin filtros"
    return " · ".join(f"{c['label']}: {c['value']}" for c in chips)


def build_mdm_context(filters: MDMReportFilters) -> dict[str, Any]:
    kpis = mdm_service.get_kpis(filters.date_from, filters.date_to, filters.office)
    banner = mdm_service.get_banner()
    top_patches = mdm_service.get_top_patches(limit=10, patch_id=filters.patch_id)
    offices = mdm_service.get_by_office(filters.date_from, filters.date_to, filters.office)

    chips: list[dict[str, str]] = []
    if filters.date_from or filters.date_to:
        chips.append({
            "label": "Fechas",
            "value": f"{filters.date_from or '—'} → {filters.date_to or '—'}",
        })
    if filters.office:
        chips.append({"label": "Oficinas", "value": filters.office})
    if filters.patch_id:
        chips.append({"label": "Parches", "value": filters.patch_id})

    return {
        "title": "Informe MDM · Parches",
        "subtitle": "Estado de despliegue de parches en endpoints",
        "filter_chips": chips,
        "emitted_at_human": _now_human(),
        "filters_summary": _summarize(chips),
        "kpis": kpis.model_dump(),
        "banner": banner.model_dump(),
        "top_patches": [p.model_dump() for p in top_patches],
        "offices": [o.model_dump() for o in offices],
    }


def build_training_context(filters: TrainingReportFilters) -> dict[str, Any]:
    kpis = training_service.get_kpis(
        filters.date_from, filters.date_to, filters.location, filters.module
    )
    banner = training_service.get_banner()
    countries = training_service.get_by_country(
        filters.date_from, filters.date_to, filters.module
    )
    outliers = training_service.get_outliers(
        limit=10, date_from=filters.date_from, date_to=filters.date_to,
        location=filters.location,
    )

    chips: list[dict[str, str]] = []
    if filters.date_from or filters.date_to:
        chips.append({
            "label": "Fechas",
            "value": f"{filters.date_from or '—'} → {filters.date_to or '—'}",
        })
    if filters.location:
        chips.append({"label": "Países", "value": filters.location})
    if filters.module:
        chips.append({"label": "Módulos", "value": filters.module})

    return {
        "title": "Informe Formación",
        "subtitle": "Estado de la formación de concienciación en seguridad",
        "filter_chips": chips,
        "emitted_at_human": _now_human(),
        "filters_summary": _summarize(chips),
        "kpis": kpis.model_dump(),
        "banner": banner.model_dump(),
        "countries": [c.model_dump() for c in countries],
        "outliers": [o.model_dump() for o in outliers],
    }
```

Note: `get_by_country` and `get_outliers` already accept `module` (added in Task 3); `get_outliers` does **not** take a `module` arg in the current signature but does accept `location`. We pass module via `get_by_country` only; outliers stay filtered by location/date.

- [ ] **Step 4: Create `mdm.html`**

Create `backend/app/reports/templates/mdm.html`:

```html
{% extends "base.html" %}

{% block kpis %}
<div class="kpi-row">
  <div class="kpi-card ok">
    <div class="kpi-label">Completed</div>
    <div class="kpi-value">{{ kpis.completed }}</div>
    <div class="kpi-meta">{{ kpis.completed_pct }}% del parque</div>
  </div>
  <div class="kpi-card warning">
    <div class="kpi-label">Missing</div>
    <div class="kpi-value">{{ kpis.missing }}</div>
    <div class="kpi-meta">{{ kpis.missing_pct }}% del parque</div>
  </div>
  <div class="kpi-card brand">
    <div class="kpi-label">In Progress</div>
    <div class="kpi-value">{{ kpis.in_progress }}</div>
    <div class="kpi-meta">{{ kpis.in_progress_pct }}% del parque</div>
  </div>
  <div class="kpi-card critical">
    <div class="kpi-label">Failed</div>
    <div class="kpi-value">{{ kpis.failed }}</div>
    <div class="kpi-meta">{{ kpis.failed_pct }}% del parque</div>
  </div>
</div>
{% endblock %}

{% block banner %}
<div class="risk-banner {{ banner.severity }}">
  <div class="title">{{ banner.title }}</div>
  <div class="desc">{{ banner.description }}</div>
</div>
{% endblock %}

{% block content %}
<h2 class="section-title">Top parches por riesgo</h2>
{% if top_patches %}
<table class="report-table">
  <thead>
    <tr>
      <th>Bulletin</th>
      <th>Descripción</th>
      <th class="num">Missing</th>
      <th class="num">Failed</th>
      <th class="num">Installed</th>
      <th class="num">Risk score</th>
    </tr>
  </thead>
  <tbody>
    {% for p in top_patches %}
    <tr>
      <td>{{ p.bulletin_id }}</td>
      <td>{{ p.description }}</td>
      <td class="num">{{ p.missing_systems }}</td>
      <td class="num">{{ p.failed_systems }}</td>
      <td class="num">{{ p.installed_systems }}</td>
      <td class="num">{{ p.risk_score }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% else %}
<div class="empty-state">Sin parches para los filtros aplicados</div>
{% endif %}

<h2 class="section-title">Estado por oficina</h2>
{% if offices %}
<table class="report-table">
  <thead>
    <tr>
      <th>Oficina</th>
      <th>Código</th>
      <th class="num">Total</th>
      <th class="num">Completed</th>
      <th class="num">Missing</th>
      <th class="num">In Progress</th>
      <th class="num">Failed</th>
    </tr>
  </thead>
  <tbody>
    {% for o in offices %}
    <tr>
      <td>{{ o.office }}</td>
      <td>{{ o.office_code }}</td>
      <td class="num">{{ o.total }}</td>
      <td class="num">{{ o.completed }}</td>
      <td class="num">{{ o.missing }}</td>
      <td class="num">{{ o.in_progress }}</td>
      <td class="num">{{ o.failed }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% else %}
<div class="empty-state">Sin oficinas para los filtros aplicados</div>
{% endif %}
{% endblock %}
```

- [ ] **Step 5: Run tests**

```bash
cd backend && uv run pytest tests/test_reports_context.py -v
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/reports/context.py backend/app/reports/templates/mdm.html backend/tests/test_reports_context.py
git commit -m "feat(reports): MDM PDF context builder and template"
```

---

## Task 8 · Training template (context already built in Task 7)

**Files:**
- Create: `backend/app/reports/templates/training.html`

- [ ] **Step 1: Create `training.html`**

Create `backend/app/reports/templates/training.html`:

```html
{% extends "base.html" %}

{% block kpis %}
<div class="kpi-row">
  <div class="kpi-card brand">
    <div class="kpi-label">Usuarios</div>
    <div class="kpi-value">{{ kpis.total_users }}</div>
    <div class="kpi-meta">{{ kpis.total_countries }} países · {{ kpis.total_modules }} módulos</div>
  </div>
  <div class="kpi-card ok">
    <div class="kpi-label">% Finalización</div>
    <div class="kpi-value">{{ (kpis.completion_rate * 100) | round(1) }}%</div>
    <div class="kpi-meta">Objetivo &gt; 70%</div>
  </div>
  <div class="kpi-card warning">
    <div class="kpi-label">Score medio</div>
    <div class="kpi-value">{{ kpis.avg_score_pct }}%</div>
    <div class="kpi-meta">Objetivo &gt; 25%</div>
  </div>
  <div class="kpi-card brand">
    <div class="kpi-label">Tiempo medio</div>
    <div class="kpi-value">{{ kpis.avg_duration_min }} min</div>
    <div class="kpi-meta">Por usuario</div>
  </div>
</div>
{% endblock %}

{% block banner %}
<div class="risk-banner {{ banner.severity }}">
  <div class="title">{{ banner.title }}</div>
  <div class="desc">{{ banner.description }}</div>
</div>
{% endblock %}

{% block content %}
<h2 class="section-title">Estado por país</h2>
{% if countries %}
<table class="report-table">
  <thead>
    <tr>
      <th>País</th>
      <th class="num">Usuarios</th>
      <th class="num">% Finalización</th>
      <th class="num">Score medio</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {% for c in countries %}
    <tr>
      <td>{{ c.location }}</td>
      <td class="num">{{ c.user_count }}</td>
      <td class="num">{{ (c.completion_rate * 100) | round(1) }}%</td>
      <td class="num">{{ c.avg_score_pct }}%</td>
      <td>{% if c.below_threshold %}<span class="warn-pill">⚠ Bajo umbral</span>{% endif %}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% else %}
<div class="empty-state">Sin países para los filtros aplicados</div>
{% endif %}

<h2 class="section-title">Outliers · mucho tiempo, poco resultado</h2>
{% if outliers %}
<table class="report-table">
  <thead>
    <tr>
      <th>Usuario</th>
      <th>País</th>
      <th class="num">Tiempo (min)</th>
      <th class="num">Score</th>
      <th>Severidad</th>
    </tr>
  </thead>
  <tbody>
    {% for o in outliers %}
    <tr>
      <td>{{ o.user_id }}</td>
      <td>{{ o.location }}</td>
      <td class="num">{{ o.total_duration_min }}</td>
      <td class="num">{{ o.score_pct }}%</td>
      <td>{{ o.severity }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% else %}
<div class="empty-state">Sin outliers para los filtros aplicados</div>
{% endif %}
{% endblock %}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/reports/templates/training.html
git commit -m "feat(reports): Training PDF template"
```

---

## Task 9 · Reports router + main.py wiring

**Files:**
- Create: `backend/app/routers/reports.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_reports_endpoints.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_reports_endpoints.py`:

```python
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


def test_mdm_report_returns_pdf(seeded):
    r = client.get("/api/v1/reports/mdm.pdf?office=GLE")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.headers["content-disposition"].startswith("inline; filename=")
    assert r.content.startswith(b"%PDF")
    assert len(r.content) > 1000


def test_training_report_returns_pdf(seeded):
    r = client.get("/api/v1/reports/training.pdf?location=España")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_mdm_report_503_when_not_loaded():
    r = client.get("/api/v1/reports/mdm.pdf")
    assert r.status_code == 503


def test_mdm_report_422_on_bad_date(seeded):
    r = client.get("/api/v1/reports/mdm.pdf?date_from=11/05/2026")
    assert r.status_code == 422
```

- [ ] **Step 2: Run; expect failure (route not registered)**

```bash
cd backend && uv run pytest tests/test_reports_endpoints.py -v
```

Expected: 404 / module not found.

- [ ] **Step 3: Implement the router**

Create `backend/app/routers/reports.py`:

```python
"""PDF report endpoints."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import ValidationError

from app.reports import renderer
from app.reports.context import build_mdm_context, build_training_context
from app.reports.schemas import MDMReportFilters, TrainingReportFilters
from app.storage.memory import store

router = APIRouter(prefix="/reports", tags=["Reports"])


def _today_iso() -> str:
    return date.today().isoformat()


def _mdm_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    patch_id: Optional[str] = None,
    office: Optional[str] = None,
) -> MDMReportFilters:
    try:
        return MDMReportFilters(
            date_from=date_from, date_to=date_to,
            patch_id=patch_id, office=office,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())


def _training_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
    module: Optional[str] = None,
) -> TrainingReportFilters:
    try:
        return TrainingReportFilters(
            date_from=date_from, date_to=date_to,
            location=location, module=module,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())


@router.get("/mdm.pdf")
async def report_mdm(filters: MDMReportFilters = Depends(_mdm_filters)):
    if not store.mdm_loaded:
        raise HTTPException(status_code=503, detail="MDM data not loaded.")
    context = build_mdm_context(filters)
    pdf = renderer.render("mdm.html", context)
    filename = f"pescanova-mdm-{_today_iso()}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/training.pdf")
async def report_training(filters: TrainingReportFilters = Depends(_training_filters)):
    if not store.training_loaded:
        raise HTTPException(status_code=503, detail="Training data not loaded.")
    context = build_training_context(filters)
    pdf = renderer.render("training.html", context)
    filename = f"pescanova-formacion-{_today_iso()}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
```

- [ ] **Step 4: Wire the router in `main.py`**

In `backend/app/main.py`, change the import line:

```python
from app.routers import mdm, training, ingest, reports
```

And add after the existing `include_router` calls:

```python
app.include_router(reports.router, prefix="/api/v1")
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && uv run pytest -v
```

Expected: all tests pass. If WeasyPrint is not installed locally, run inside the container.

- [ ] **Step 6: Manual smoke check**

Start the stack and download a PDF:

```bash
docker compose up -d backend
curl -fsS "http://localhost:8000/api/v1/reports/mdm.pdf" -o /tmp/mdm.pdf
file /tmp/mdm.pdf
```

Expected: `/tmp/mdm.pdf: PDF document, version 1.x`. Open it and verify the layout matches the design.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/reports.py backend/app/main.py backend/tests/test_reports_endpoints.py
git commit -m "feat(reports): mount /api/v1/reports/{mdm,training}.pdf endpoints"
```

---

## Task 10 · Frontend MultiSelect primitive

**Files:**
- Create: `frontend/components/ui/MultiSelect.tsx`

- [ ] **Step 1: Implement `MultiSelect`**

Create `frontend/components/ui/MultiSelect.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

export type MultiSelectOption = { value: string; label: string }

type Props = {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function MultiSelect({ label, options, selected, onChange, placeholder = 'Todos' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  }

  const summary =
    selected.length === 0 ? placeholder
      : selected.length === 1 ? options.find(o => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} seleccionados`

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-xs px-2 py-1.5 rounded border bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        {summary}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-white shadow-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-slate-400">Sin opciones</div>
          )}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/MultiSelect.tsx
git commit -m "feat(ui): minimal MultiSelect primitive"
```

---

## Task 11 · Frontend DateRangeInput primitive

**Files:**
- Create: `frontend/components/ui/DateRangeInput.tsx`

- [ ] **Step 1: Implement `DateRangeInput`**

Create `frontend/components/ui/DateRangeInput.tsx`:

```tsx
'use client'

type Props = {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
}

export function DateRangeInput({ from, to, onChange }: Props) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Rango de fechas</label>
      <div className="flex gap-2">
        <input
          type="date"
          value={from}
          onChange={e => onChange({ from: e.target.value, to })}
          className="text-xs px-2 py-1.5 rounded border bg-white w-full"
          style={{ borderColor: 'var(--border)' }}
        />
        <input
          type="date"
          value={to}
          onChange={e => onChange({ from, to: e.target.value })}
          className="text-xs px-2 py-1.5 rounded border bg-white w-full"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/DateRangeInput.tsx
git commit -m "feat(ui): DateRangeInput primitive"
```

---

## Task 12 · Frontend API helpers for reports + training modules

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add report URL builders and the modules endpoint**

In `frontend/lib/api.ts`, add a new top-level export and extend `api.training`:

After the `BASE_URL` constant, add:

```ts
function reportUrl(kind: 'mdm' | 'training', params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length) qs.set(k, v)
  }
  const suffix = kind === 'mdm' ? 'mdm.pdf' : 'training.pdf'
  const q = qs.toString()
  return `${BASE_URL}/reports/${suffix}${q ? `?${q}` : ''}`
}
```

Inside `api.training`, add (next to `users`):

```ts
modules: () => fetchApi<string[]>('/training/modules'),
```

Add a new top-level entry alongside `mdm`, `training`, `ingest`:

```ts
reports: {
  mdmUrl: (params: { date_from?: string; date_to?: string; patch_id?: string; office?: string }) =>
    reportUrl('mdm', params),
  trainingUrl: (params: { date_from?: string; date_to?: string; location?: string; module?: string }) =>
    reportUrl('training', params),
},
```

- [ ] **Step 2: Quick smoke test**

Start frontend (`docker compose up -d frontend`) and in the browser dev console at `localhost:3000`:

```js
fetch('http://localhost:8000/api/v1/training/modules').then(r => r.json()).then(console.log)
```

Expected: `{ data: [...] }` with a list of assignment names.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(api): client helpers for /reports/*.pdf and /training/modules"
```

---

## Task 13 · ReportButton component (popover + form)

**Files:**
- Create: `frontend/components/ui/ReportButton.tsx`

- [ ] **Step 1: Implement `ReportButton`**

Create `frontend/components/ui/ReportButton.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { MultiSelect, MultiSelectOption } from './MultiSelect'
import { DateRangeInput } from './DateRangeInput'

type Kind = 'mdm' | 'training'

type Props = { kind: Kind }

type MdmOptions = { patches: MultiSelectOption[]; offices: MultiSelectOption[] }
type TrainingOptions = { countries: MultiSelectOption[]; modules: MultiSelectOption[] }

export function ReportButton({ kind }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedPatches, setSelectedPatches] = useState<string[]>([])
  const [selectedOffices, setSelectedOffices] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const [mdmOpts, setMdmOpts] = useState<MdmOptions>({ patches: [], offices: [] })
  const [trainOpts, setTrainOpts] = useState<TrainingOptions>({ countries: [], modules: [] })

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (kind === 'mdm' && mdmOpts.patches.length === 0) {
      Promise.all([api.mdm.topPatches(50), api.mdm.byOffice()]).then(([patches, offices]) => {
        setMdmOpts({
          patches: (patches.data ?? []).map(p => ({
            value: String(p.patch_id),
            label: `${p.bulletin_id} — ${p.description.slice(0, 40)}`,
          })),
          offices: (offices.data ?? []).map(o => ({
            value: o.office_code,
            label: `${o.office_code} · ${o.office}`,
          })),
        })
      })
    }
    if (kind === 'training' && trainOpts.countries.length === 0) {
      Promise.all([api.training.byCountry(), api.training.modules()]).then(([countries, modules]) => {
        setTrainOpts({
          countries: (countries.data ?? []).map(c => ({ value: c.location, label: c.location })),
          modules: (modules.data ?? []).map(m => ({ value: m, label: m })),
        })
      })
    }
  }, [open, kind, mdmOpts.patches.length, trainOpts.countries.length])

  function buildUrl(): string {
    if (kind === 'mdm') {
      return api.reports.mdmUrl({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        patch_id: selectedPatches.length ? selectedPatches.join(',') : undefined,
        office: selectedOffices.length ? selectedOffices.join(',') : undefined,
      })
    }
    return api.reports.trainingUrl({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      location: selectedCountries.length ? selectedCountries.join(',') : undefined,
      module: selectedModules.length ? selectedModules.join(',') : undefined,
    })
  }

  function onGenerate() {
    window.open(buildUrl(), '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Exportar PDF"
        className="w-7 h-7 inline-flex items-center justify-center rounded text-xs font-medium"
        style={{
          backgroundColor: open ? 'var(--brand-blue)' : 'transparent',
          color: open ? '#fff' : 'var(--text-secondary)',
          border: '0.5px solid var(--border)',
        }}
      >
        PDF
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50 w-72 p-3 rounded border bg-white shadow-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Exportar {kind === 'mdm' ? 'MDM' : 'Formación'} a PDF
          </div>

          <div className="space-y-2">
            <DateRangeInput from={dateFrom} to={dateTo} onChange={({ from, to }) => { setDateFrom(from); setDateTo(to) }} />

            {kind === 'mdm' && (
              <>
                <MultiSelect label="Tipo de parche" options={mdmOpts.patches}
                             selected={selectedPatches} onChange={setSelectedPatches} />
                <MultiSelect label="Oficina" options={mdmOpts.offices}
                             selected={selectedOffices} onChange={setSelectedOffices} />
              </>
            )}
            {kind === 'training' && (
              <>
                <MultiSelect label="País" options={trainOpts.countries}
                             selected={selectedCountries} onChange={setSelectedCountries} />
                <MultiSelect label="Módulo" options={trainOpts.modules}
                             selected={selectedModules} onChange={setSelectedModules} />
              </>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1.5 rounded"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGenerate}
              className="text-xs px-3 py-1.5 rounded text-white font-medium"
              style={{ backgroundColor: 'var(--brand-blue)' }}
            >
              Generar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/ReportButton.tsx
git commit -m "feat(ui): ReportButton with popover, filters and window.open"
```

---

## Task 14 · Mount ReportButton in MDM and Training pages

**Files:**
- Modify: `frontend/app/mdm/page.tsx`
- Modify: `frontend/app/training/page.tsx`

- [ ] **Step 1: Add the button to `/mdm`**

In `frontend/app/mdm/page.tsx`, add the import at the top of the existing imports:

```tsx
import { ReportButton } from '@/components/ui/ReportButton'
```

Find the page header (the section that wraps the page title or banner — same place where filters or status toggles live). At the start of the existing controls row, add:

```tsx
<div className="flex justify-end mb-2">
  <ReportButton kind="mdm" />
</div>
```

The exact location is a one-liner addition: if the page returns a top-level `<div>` whose first child is the risk banner, insert the new wrapper before that banner. The visual goal is "compact PDF button in the top right of the MDM dashboard".

- [ ] **Step 2: Add the button to `/training`**

In `frontend/app/training/page.tsx`, apply the symmetrical change:

```tsx
import { ReportButton } from '@/components/ui/ReportButton'
```

And the same `<div className="flex justify-end mb-2"><ReportButton kind="training" /></div>` block at the top of the layout.

- [ ] **Step 3: Manual verification**

```bash
docker compose up -d
```

In a browser:
- Open `http://localhost:3000/mdm`. Verify the PDF button shows in the top-right corner.
- Click the button → popover opens with date range, parches, oficinas selectors.
- Click "Generar PDF" with no filters → a new tab opens with the PDF of all MDM data.
- Click the button again, choose a date range → new PDF reflects the filter.
- Repeat for `/training` (countries + modules).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/mdm/page.tsx frontend/app/training/page.tsx
git commit -m "feat(dashboard): mount ReportButton in MDM and Training pages"
```

---

## Task 15 · Documentation update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "PDF reports" subsection**

Open `README.md` and append a new section near the end (before any "License" or footer if present):

```markdown
## PDF reports

Two PDF reports are exposed at:

- `GET /api/v1/reports/mdm.pdf` — filters: `date_from`, `date_to`, `patch_id`, `office`
- `GET /api/v1/reports/training.pdf` — filters: `date_from`, `date_to`, `location`, `module`

From the UI, each tab shows a compact "PDF" button in its header that opens a popover with filter selectors. Click "Generar PDF" to open the report in a new tab.

### Local development on Windows

WeasyPrint (the HTML→PDF engine) depends on GTK3 native libraries that ship cleanly on Debian/Ubuntu but not on Windows. The recommended workflow on Windows is:

- Run the backend inside Docker (`docker compose up backend`).
- Run backend tests inside the container: `docker compose run --rm backend pytest -v`.

If you want to install WeasyPrint natively on Windows, follow https://doc.courtbouillon.org/weasyprint/stable/first_steps.html.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: PDF reports endpoints and Windows dev note"
```

---

## Self-review checklist (already performed inline)

- **Spec coverage**
  - §3.1 backend structure → Tasks 4–9.
  - §3.2 endpoints (mdm.pdf, training.pdf with documented filters) → Task 9.
  - §3.3 flow → Tasks 9 (backend) + 13–14 (frontend).
  - §4 templates and branding → Tasks 5, 7, 8.
  - §5 frontend (ReportButton + MultiSelect + filters per kind) → Tasks 10–14.
  - §6 error handling (503, 422, empty result) → Tasks 9 (router) + 7/8 (`empty-state`).
  - §7 testing → Tasks 4, 6, 7, 9 each have their own tests.
  - §8 deps + Docker → Task 1.
  - §9 acceptance criteria → covered by the union of tasks above.
  - §10 decisions pending: `fonts-dejavu-core` chosen as fallback (font Inter optional, embedding deferred); `/training/modules` added in Task 3; `MultiSelect` placed in `components/ui/` per existing convention.

- **Placeholders**: none found; no TBD, no "implement later", no "add validation" without code.

- **Type consistency**: `MDMReportFilters` / `TrainingReportFilters` defined in Task 4 are used unchanged in Task 7 (context) and Task 9 (router). `reportUrl` defined in Task 12 used in Task 13. `MultiSelectOption` defined in Task 10 imported in Task 13.

- **Scope**: single feature, ~15 bite-sized tasks, each one self-contained and commit-able.
