# Backend Ingesta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full FastAPI backend — transforms, services, and routers — so the two dashboards (MDM + Formación) serve real data from the uploaded XLSX files.

**Architecture:** XLSX uploads → loaders (clean + validate) → InMemoryStore (parquet-backed) → services (aggregations) → routers (REST endpoints). Services receive filter params and apply them at query time; the DataSource abstraction separates storage from business logic.

**Tech Stack:** Python 3.11, FastAPI 0.110+, Pandas 2.2, openpyxl, Pydantic v2, pyarrow, uv (package runner).

---

## Codebase state before starting

C0 already provided:
- All Pydantic response schemas in `backend/app/models/responses.py` — **DO NOT MODIFY**.
- Skeleton routers with response_model decorators.
- Stubs for all services, transforms, storage.
- `caesar.py` is partially correct but uses a 27-letter Spanish alphabet — this causes wrong decoding for letters o–z. Must be fixed to standard 26-letter alphabet (ñ passes through as non-alpha).
- `normalize.py` has location normalization and ISO map but missing `user_score_pct`.
- `loaders.py` is empty stubs.
- `training.py` router imports four types that don't exist in responses.py (`TrainingByCountry`, `TrainingDistribution`, `TrainingOutliers`, `TrainingTimeline`). Fix by removing those imports — response_model decorators already use the correct inline types.

## Verified XLSX column names

**MDM Sheet 1** ("ManageEngine Endpoint Central C"):
`Computer Name`, `Domain`, `Operating System`, `Patch ID`, `Patch Description`, `Deployment Status`, `Deployed Date`, `Remarks`

**MDM Sheet 2** ("ManageEngine Endpoint Centr (2)"):
`Computer Name`, `Domain`, `Remote Office`, `Missing Patches`, `Installed Patches`, `Failed Patches`, `Deployment Status`, `Updated At`, `Last Contact Time`, `Remarks`, `Last Deployment Time`

**MDM Sheet 3** ("ManageEngine Endpoint Centr (3)"):
`Patch ID`, `Bulletin ID`, `Patch Description`, `Missing Systems`, `Installed Systems`, `Failed Systems`

**Training Sheet A** ("Formación A"):
`Email Address`, `Overall User Score`, `Module Status`, `Module Attempt Start Date and Time (UTC)`, `Module Attempt Completed Date and Time (UTC)`, `Module Attempt Duration (min)`, `Module Name (User Display)`, `Assignment Name`, `Location`

**Training Sheet B** ("Formación B"):
`Email Address`, `Modules Completion`, `Modules Assigned`, `Overall User Score`, `Total Duration (min)`, `Module Attempts`, `Module Completion Date & Time (UTC)`, `Location`

## File map

| File | Action | Responsibility |
|---|---|---|
| `backend/app/transforms/caesar.py` | Modify | Fix 26-letter alphabet |
| `backend/app/transforms/normalize.py` | Modify | Add `user_score_pct` |
| `backend/app/transforms/loaders.py` | Implement | Load + clean XLSX → DataFrames |
| `backend/app/storage/datasource.py` | Implement | `FileDataSource` reads parquet |
| `backend/app/main.py` | Modify | Add lifespan for startup parquet load |
| `backend/app/services/friction.py` | Implement | `compute_friction` |
| `backend/app/services/mdm_service.py` | Implement | 5 MDM aggregation functions |
| `backend/app/services/training_service.py` | Implement | 7 Training aggregation functions |
| `backend/app/routers/ingest.py` | Implement | Upload → load → cache → parquet |
| `backend/app/routers/mdm.py` | Implement | Router bodies calling mdm_service |
| `backend/app/routers/training.py` | Fix + Implement | Fix imports, router bodies |
| `backend/tests/__init__.py` | Create | Empty |
| `backend/tests/test_caesar.py` | Create | Unit tests decode_caesar |
| `backend/tests/test_normalize.py` | Create | Unit tests user_score_pct |
| `backend/tests/test_friction.py` | Create | Unit tests compute_friction |
| `backend/pyproject.toml` | Modify | Add pytest dev dependency |

---

## Task 1: Fix caesar.py — 26-letter alphabet

**Files:**
- Modify: `backend/app/transforms/caesar.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_caesar.py`

The current implementation uses `"abcdefghijklmnñopqrstuvwxyz"` (27 letters).
This shifts o–z one position right, corrupting those letters.
The cipher in the XLSX used the standard 26-letter alphabet; ñ/Ñ are not encoded and pass through unchanged.

Verified: `Gletipe` → `Chapela` requires p(15)→l(11) which only works with 26-letter (p=15, 15-4=11=l). With 27-letter, p=16, 16-4=12=m → wrong.

- [ ] **Step 1: Create tests directory**

```
backend/tests/__init__.py  (empty file)
```

- [ ] **Step 2: Write failing tests**

Create `backend/tests/test_caesar.py`:

```python
from app.transforms.caesar import decode_caesar, auto_detect_shift


def test_decode_chapela():
    assert decode_caesar("Gletipe", -4) == "Chapela"


def test_decode_porrino():
    assert decode_caesar("Tsvvmñs", -4) == "Porriño"


def test_decode_arteixo():
    assert decode_caesar("Evximbs", -4) == "Arteixo"


def test_decode_boiro():
    assert decode_caesar("Bszi", -4) == "Boiro"


def test_decode_espana_segment():
    # "Iwteñe" → "España" (ñ passes through)
    assert decode_caesar("Iwteñe", -4) == "España"


def test_passthrough_non_alpha():
    assert decode_caesar("(GLE) - 123", -4) == "(GLE) - 123"


def test_wrap_around():
    # a + (-4) wraps: a=0, 0-4 = -4 % 26 = 22 = w
    assert decode_caesar("a", -4) == "w"


def test_uppercase_preserved():
    result = decode_caesar("GLETIPE", -4)
    assert result == "CHAPELA"


def test_auto_detect_returns_minus_4():
    sample = ["Gletipe", "Tsvvmñs", "Evximbs", "Bszi", "Iwteñe"]
    assert auto_detect_shift(sample) == -4
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_caesar.py -v
```

Expected: FAIL with assertion errors (wrong results due to 27-letter alphabet).

- [ ] **Step 4: Fix caesar.py alphabet**

Replace entire `backend/app/transforms/caesar.py`:

```python
"""Caesar cipher decoder for MDM Remote Office field.

Uses the standard 26-letter English alphabet. ñ/Ñ and all other
non-alpha characters pass through unchanged — the original encoder
treated them as non-alphabetic.
"""

ALPHABET = "abcdefghijklmnopqrstuvwxyz"
ALPHABET_UPPER = ALPHABET.upper()


def decode_caesar(text: str, shift: int = -4) -> str:
    """Rotate each ASCII letter by `shift` positions in the 26-letter alphabet."""
    n = len(ALPHABET)
    result = []
    for ch in text:
        if ch in ALPHABET:
            idx = (ALPHABET.index(ch) + shift) % n
            result.append(ALPHABET[idx])
        elif ch in ALPHABET_UPPER:
            idx = (ALPHABET_UPPER.index(ch) + shift) % n
            result.append(ALPHABET_UPPER[idx])
        else:
            result.append(ch)
    return "".join(result)


def auto_detect_shift(sample: list[str]) -> int:
    """Try shifts in {-4, -3, -5, +4, +3, +5}; return the one producing most legible Spanish."""
    spanish_words = {"españa", "galicia", "porriño", "chapela", "arteixo", "boiro", "carballo", "vigo"}
    best_shift, best_score = -4, -1
    for s in (-4, -3, -5, 4, 3, 5):
        decoded = [decode_caesar(t, s).lower() for t in sample[:50]]
        score = sum(any(w in d for w in spanish_words) for d in decoded)
        if score > best_score:
            best_score, best_shift = score, s
    return best_shift
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_caesar.py -v
```

Expected: all 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/transforms/caesar.py backend/tests/__init__.py backend/tests/test_caesar.py
git commit -m "fix: use standard 26-letter alphabet in caesar decoder; add tests"
```

---

## Task 2: Add user_score_pct to normalize.py + tests

**Files:**
- Modify: `backend/app/transforms/normalize.py`
- Create: `backend/tests/test_normalize.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_normalize.py`:

```python
from app.transforms.normalize import user_score_pct, normalize_location, country_to_iso


def test_score_pct_normal():
    # 500 raw score, 1 module completed → 50%
    assert user_score_pct(500, 1) == 50.0


def test_score_pct_clamped():
    # 1550 raw score, 1 module → 155%, clamped to 100
    assert user_score_pct(1550, 1) == 100.0


def test_score_pct_zero_modules():
    assert user_score_pct(1000, 0) == 0.0


def test_score_pct_none_score():
    # None → treat as 0 → 0.0
    assert user_score_pct(None, 3) == 0.0


def test_score_pct_none_modules():
    assert user_score_pct(500, None) == 0.0


def test_normalize_france():
    assert normalize_location("France") == "Francia"
    assert normalize_location("Francia") == "Francia"


def test_normalize_empty():
    assert normalize_location("") == "Sin asignar"
    assert normalize_location("   ") == "Sin asignar"


def test_country_iso():
    assert country_to_iso("España") == "ES"
    assert country_to_iso("Nicaragua") == "NI"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && uv run pytest tests/test_normalize.py -v
```

Expected: FAIL (user_score_pct not yet defined).

- [ ] **Step 3: Add user_score_pct to normalize.py**

Append to `backend/app/transforms/normalize.py` after the existing functions:

```python


def user_score_pct(overall_score_raw, modules_completed) -> float:
    """
    Score = (raw_score / (1000 * modules_completed)) * 100, clamped to 100.
    None inputs → 0 (penalizes user/country).
    """
    if overall_score_raw is None:
        overall_score_raw = 0
    if modules_completed is None or modules_completed == 0:
        return 0.0
    pct = (overall_score_raw / (1000.0 * modules_completed)) * 100.0
    return min(pct, 100.0)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_normalize.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/transforms/normalize.py backend/tests/test_normalize.py
git commit -m "feat: add user_score_pct to normalize; add tests"
```

---

## Task 3: Implement loaders.py

**Files:**
- Modify: `backend/app/transforms/loaders.py`

- [ ] **Step 1: Implement load_mdm_xlsx and load_training_xlsx**

Replace entire `backend/app/transforms/loaders.py`:

```python
"""XLSX ingestion and cleaning."""
import io
import re
import pandas as pd

from app.transforms.caesar import decode_caesar, auto_detect_shift
from app.transforms.normalize import normalize_location, user_score_pct

_MDM_EVENTS_SHEET = 0
_MDM_DEVICES_SHEET = 1
_MDM_PATCHES_SHEET = 2
_TRAINING_EVENTS_SHEET = 0
_TRAINING_USERS_SHEET = 1

EXPECTED_EVENTS = 10_988
EXPECTED_USERS = 1_230


def load_mdm_xlsx(path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Returns (mdm_events, mdm_devices, mdm_patches)."""
    events = pd.read_excel(path, sheet_name=_MDM_EVENTS_SHEET)
    devices = pd.read_excel(path, sheet_name=_MDM_DEVICES_SHEET)
    patches = pd.read_excel(path, sheet_name=_MDM_PATCHES_SHEET)

    # ── events ──────────────────────────────────────────────────────────────
    events = events.rename(columns={
        "Computer Name": "computer_name",
        "Operating System": "os",
        "Patch ID": "patch_id",
        "Patch Description": "patch_description",
        "Deployment Status": "deployment_status",
        "Deployed Date": "deployed_at",
        "Remarks": "remarks",
    })
    events["deployed_at"] = pd.to_datetime(events["deployed_at"], errors="coerce")
    events = events[["computer_name", "os", "patch_id", "patch_description",
                      "deployment_status", "deployed_at", "remarks"]]

    # ── devices ─────────────────────────────────────────────────────────────
    devices = devices.rename(columns={
        "Computer Name": "computer_name",
        "Remote Office": "remote_office_raw",
        "Missing Patches": "missing_patches",
        "Installed Patches": "installed_patches",
        "Failed Patches": "failed_patches",
        "Deployment Status": "patching_status",
        "Last Contact Time": "last_contact_at",
        "Last Deployment Time": "last_deployment_at",
    })
    devices["last_contact_at"] = pd.to_datetime(devices["last_contact_at"], errors="coerce")
    devices["last_deployment_at"] = pd.to_datetime(devices["last_deployment_at"], errors="coerce")

    # Detect and apply best Caesar shift for Remote Office
    raw_sample = devices["remote_office_raw"].dropna().astype(str).tolist()
    shift = auto_detect_shift(raw_sample)
    devices["remote_office_decoded"] = devices["remote_office_raw"].apply(
        lambda x: decode_caesar(str(x), shift) if pd.notna(x) else ""
    )
    devices["remote_office_code"] = devices["remote_office_decoded"].apply(
        lambda x: m.group(1) if (m := re.search(r"\(([A-Z]{2,5})\)", x)) else ""
    )
    devices = devices[["computer_name", "remote_office_raw", "remote_office_decoded",
                        "remote_office_code", "missing_patches", "installed_patches",
                        "failed_patches", "patching_status", "last_contact_at", "last_deployment_at"]]

    # ── patches ─────────────────────────────────────────────────────────────
    patches = patches.rename(columns={
        "Patch ID": "patch_id",
        "Bulletin ID": "bulletin_id",
        "Patch Description": "description",
        "Missing Systems": "missing_systems",
        "Installed Systems": "installed_systems",
        "Failed Systems": "failed_systems",
    })
    patches["risk_score"] = patches["missing_systems"] + patches["failed_systems"] * 2
    patches = patches[["patch_id", "bulletin_id", "description",
                        "missing_systems", "installed_systems", "failed_systems", "risk_score"]]

    return events, devices, patches


def load_training_xlsx(path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (training_events, training_users) — Removed rows filtered, orphan users excluded."""
    events_raw = pd.read_excel(path, sheet_name=_TRAINING_EVENTS_SHEET)
    users_raw = pd.read_excel(path, sheet_name=_TRAINING_USERS_SHEET)

    # ── events ──────────────────────────────────────────────────────────────
    events = events_raw.rename(columns={
        "Email Address": "user_id",
        "Overall User Score": "module_event_score",
        "Module Attempt Start Date and Time (UTC)": "started_at",
        "Module Attempt Completed Date and Time (UTC)": "completed_at",
        "Module Attempt Duration (min)": "duration_min",
        "Module Name (User Display)": "module_name",
        "Location": "location_raw",
        "Module Status": "module_status",
    })

    # CRITICAL: filter out Removed events
    events = events[events["module_status"] != "Removed"].copy()

    # Discard negative durations
    events = events[events["duration_min"].fillna(0) >= 0].copy()

    events["started_at"] = pd.to_datetime(events["started_at"], errors="coerce")
    events["completed_at"] = pd.to_datetime(events["completed_at"], errors="coerce")
    events["location"] = events["location_raw"].fillna("").apply(normalize_location)
    events = events[["user_id", "module_event_score", "started_at", "completed_at",
                      "duration_min", "module_name", "location_raw", "location"]]

    # ── users ────────────────────────────────────────────────────────────────
    users = users_raw.rename(columns={
        "Email Address": "user_id",
        "Modules Completion": "modules_completed",
        "Modules Assigned": "modules_assigned",
        "Overall User Score": "overall_score_raw",
        "Total Duration (min)": "total_duration_min",
        "Module Attempts": "module_attempts",
        "Module Completion Date & Time (UTC)": "last_completion_at",
        "Location": "location_raw",
    })

    # CRITICAL: exclude users with no valid events (only had Removed events)
    valid_user_ids = set(events["user_id"].unique())
    users = users[users["user_id"].isin(valid_user_ids)].copy()

    users["last_completion_at"] = pd.to_datetime(users["last_completion_at"], errors="coerce")
    users["overall_score_raw"] = users["overall_score_raw"].fillna(0).astype(int)
    users["location"] = users["location_raw"].fillna("").apply(normalize_location)
    users["score_pct"] = users.apply(
        lambda r: user_score_pct(r["overall_score_raw"], r["modules_completed"]), axis=1
    )
    users["completion_rate"] = (
        users["modules_completed"] / users["modules_assigned"].replace(0, pd.NA)
    ).fillna(0.0)
    users = users[["user_id", "modules_completed", "modules_assigned", "overall_score_raw",
                   "score_pct", "total_duration_min", "module_attempts", "last_completion_at",
                   "location_raw", "location", "completion_rate"]]

    # ── validation ───────────────────────────────────────────────────────────
    n_events = len(events)
    n_users = len(users)
    if n_events != EXPECTED_EVENTS:
        raise ValueError(
            f"Expected {EXPECTED_EVENTS} training events after filtering, got {n_events}"
        )
    if n_users != EXPECTED_USERS:
        raise ValueError(
            f"Expected {EXPECTED_USERS} training users after filtering, got {n_users}"
        )

    return events, users
```

- [ ] **Step 2: Smoke-test loaders with actual XLSX files**

```bash
cd backend && uv run python -c "
from app.transforms.loaders import load_mdm_xlsx, load_training_xlsx
ev, dev, pat = load_mdm_xlsx('../data/MDM_DATA.xlsx')
print('MDM events:', len(ev), '  devices:', len(dev), '  patches:', len(pat))
print('Sample office decoded:', dev['remote_office_decoded'].iloc[0])
print('Sample office code:', dev['remote_office_code'].iloc[0])

te, tu = load_training_xlsx('../data/Formación y concienciación.xlsx')
print('Training events:', len(te), '  users:', len(tu))
print('score_pct sample:', tu['score_pct'].describe())
"
```

Expected output (no exceptions):
```
MDM events: 655  devices: 433  patches: 12
Sample office decoded: <legible Spanish office name>
Training events: 10988  users: 1230
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/transforms/loaders.py
git commit -m "feat: implement XLSX loaders with filtering and count validation"
```

---

## Task 4: Implement FileDataSource + startup parquet cache

**Files:**
- Modify: `backend/app/storage/datasource.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Implement FileDataSource**

Replace `backend/app/storage/datasource.py`:

```python
from abc import ABC, abstractmethod
from pathlib import Path
import pandas as pd


class DataSource(ABC):
    @abstractmethod
    def load_mdm_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_devices(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_patches(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_users(self) -> pd.DataFrame: ...


class FileDataSource(DataSource):
    """Reads DataFrames from parquet files cached after upload."""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)

    def _read(self, name: str) -> pd.DataFrame:
        path = self.data_dir / f"{name}.parquet"
        if not path.exists():
            raise FileNotFoundError(f"Parquet not found: {path}")
        return pd.read_parquet(path)

    def load_mdm_events(self) -> pd.DataFrame:
        return self._read("mdm_events")

    def load_mdm_devices(self) -> pd.DataFrame:
        return self._read("mdm_devices")

    def load_mdm_patches(self) -> pd.DataFrame:
        return self._read("mdm_patches")

    def load_training_events(self) -> pd.DataFrame:
        return self._read("training_events")

    def load_training_users(self) -> pd.DataFrame:
        return self._read("training_users")


class APIDataSource(DataSource):
    """Stub V2: reads from ManageEngine and LMS live APIs."""

    def load_mdm_events(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_mdm_devices(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_mdm_patches(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_training_events(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_training_users(self) -> pd.DataFrame:
        raise NotImplementedError
```

- [ ] **Step 2: Add startup lifespan to main.py**

Replace `backend/app/main.py`:

```python
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DATA_DIR
from app.routers import mdm, training, ingest
from app.storage.memory import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: try to reload parquet files persisted from previous uploads
    data_path = Path(DATA_DIR)
    try:
        import pandas as pd
        needed_mdm = ["mdm_events", "mdm_devices", "mdm_patches"]
        needed_training = ["training_events", "training_users"]
        if all((data_path / f"{n}.parquet").exists() for n in needed_mdm):
            store.mdm_events = pd.read_parquet(data_path / "mdm_events.parquet")
            store.mdm_devices = pd.read_parquet(data_path / "mdm_devices.parquet")
            store.mdm_patches = pd.read_parquet(data_path / "mdm_patches.parquet")
        if all((data_path / f"{n}.parquet").exists() for n in needed_training):
            store.training_events = pd.read_parquet(data_path / "training_events.parquet")
            store.training_users = pd.read_parquet(data_path / "training_users.parquet")
    except Exception as exc:
        print(f"[startup] Could not reload parquet: {exc}")
    yield


app = FastAPI(
    title="Pescanova Cyber Risk Cockpit API",
    version="0.1.0",
    description="Backend para el cuadro de mando de ciberseguridad de Nueva Pescanova.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1")
app.include_router(mdm.router, prefix="/api/v1")
app.include_router(training.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/storage/datasource.py backend/app/main.py
git commit -m "feat: implement FileDataSource; add startup parquet reload"
```

---

## Task 5: Implement friction.py + tests

**Files:**
- Modify: `backend/app/services/friction.py`
- Create: `backend/tests/test_friction.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_friction.py`:

```python
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
    # All complete quickly (1 min each, p95=13) → duration_norm=1/13≈0.077, incomplete=0
    # friction = 100 * (0.55 * 0.077 + 0.45 * 0) ≈ 4.2
    events = _make_events([1.0] * 10, [True] * 10)
    score = compute_friction(events)
    assert score is not None
    assert score < 30


def test_nobody_completes_approx_45():
    # All assigned, none complete, avg_duration = 5 min → duration_norm=5/13≈0.385
    # friction = 100 * (0.55 * 0.385 + 0.45 * 1.0) = 100 * (0.212 + 0.45) = 66.2
    # But wait: incomplete_rate = 1.0, duration_norm = 5/13
    # If avg=0 duration (no completions possible), let's use duration=1
    events = _make_events([1.0] * 10, [False] * 10)
    score = compute_friction(events)
    assert score is not None
    # incomplete_rate = 1.0 → weight 0.45 * 100 = 45 minimum
    # total ≥ 45
    assert score >= 40


def test_score_between_0_and_100():
    events = _make_events([5.0, 10.0, 15.0], [True, False, True])
    score = compute_friction(events)
    assert score is not None
    assert 0.0 <= score <= 100.0
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd backend && uv run pytest tests/test_friction.py -v
```

Expected: FAIL (NotImplementedError).

- [ ] **Step 3: Implement compute_friction**

Replace `backend/app/services/friction.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_friction.py -v
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/friction.py backend/tests/test_friction.py
git commit -m "feat: implement compute_friction; add unit tests"
```

---

## Task 6: Implement mdm_service.py

**Files:**
- Modify: `backend/app/services/mdm_service.py`

- [ ] **Step 1: Implement all 5 MDM service functions**

Replace `backend/app/services/mdm_service.py`:

```python
"""MDM aggregation logic."""
from typing import Optional
import pandas as pd

from app.config import P95_DURATION_GLOBAL_MIN
from app.models.responses import (
    MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem,
)
from app.storage.memory import store

_STATUS_COMPLETED = "Patching Completed"
_STATUS_MISSING = "Patches Missing"
_STATUS_INPROGRESS = "Patching Inprogress"
_STATUS_FAILED = "Patching Failed"


def _filter_devices(date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    df = store.mdm_devices.copy()
    if date_from:
        df = df[df["last_deployment_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["last_deployment_at"] <= pd.Timestamp(date_to)]
    return df


def _filter_events(date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    df = store.mdm_events.copy()
    if date_from:
        df = df[df["deployed_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["deployed_at"] <= pd.Timestamp(date_to)]
    return df


def get_kpis(date_from: Optional[str] = None, date_to: Optional[str] = None) -> MDMKpis:
    df = _filter_devices(date_from, date_to)
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


def get_by_office(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
) -> list[MDMOfficeItem]:
    df = _filter_devices(date_from, date_to)
    if office:
        offices = [o.strip() for o in office.split(",")]
        df = df[df["remote_office_decoded"].isin(offices)]

    result = []
    for (off_name, off_code), grp in df.groupby(
        ["remote_office_decoded", "remote_office_code"]
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


def get_top_patches(limit: int = 5) -> list[MDMPatchItem]:
    df = store.mdm_patches.copy()
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


def get_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[MDMTimelineItem]:
    df = _filter_events(date_from, date_to).copy()
    df["date_only"] = df["deployed_at"].dt.date
    grouped = df.groupby(["date_only", "deployment_status"]).size().unstack(fill_value=0)

    items = []
    for date_val, row in grouped.iterrows():
        items.append(MDMTimelineItem(
            date=str(date_val),
            installed=int(row.get("Installed", 0)),
            delay_in_deployment=int(row.get("Delay in Deployment", 0)),
            reboot_pending=int(row.get("Reboot Pending", 0)),
            failed=int(row.get("Failed", 0)),
        ))
    items.sort(key=lambda x: x.date)
    return items


def get_banner() -> MDMBanner:
    df = store.mdm_devices
    total = len(df)
    failed_count = int((df["patching_status"] == _STATUS_FAILED).sum())
    missing_count = int((df["patching_status"] == _STATUS_MISSING).sum())

    # Top office by failed devices
    top_office: Optional[str] = None
    if failed_count > 0:
        failed_by_office = (
            df[df["patching_status"] == _STATUS_FAILED]
            .groupby("remote_office_decoded")
            .size()
        )
        if not failed_by_office.empty:
            top_office = str(failed_by_office.idxmax())

    if failed_count > 0:
        return MDMBanner(
            severity="critical",
            title=f"{failed_count} equipos con parches fallidos",
            description=f"Concentrado en {top_office}" if top_office else "Revisar equipos fallidos",
            failed_count=failed_count,
            missing_count=missing_count,
            top_office=top_office,
        )
    if total and missing_count / total > 0.10:
        return MDMBanner(
            severity="warning",
            title=f"{round(missing_count / total * 100)}% del parque sin parchear",
            description=f"{missing_count} equipos con parches pendientes",
            failed_count=0,
            missing_count=missing_count,
            top_office=None,
        )
    return MDMBanner(
        severity="ok",
        title="Todo el parque al día",
        description="No hay parches críticos pendientes",
        failed_count=0,
        missing_count=missing_count,
        top_office=None,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/mdm_service.py
git commit -m "feat: implement MDM service — kpis, by_office, top_patches, timeline, banner"
```

---

## Task 7: Implement training_service.py

**Files:**
- Modify: `backend/app/services/training_service.py`

- [ ] **Step 1: Implement all 7 training service functions**

Replace `backend/app/services/training_service.py`:

```python
"""Training aggregation logic."""
from typing import Optional
import pandas as pd

from app.config import LOW_SAMPLE_THRESHOLD, P95_DURATION_GLOBAL_MIN
from app.models.responses import (
    TrainingBanner, TrainingCountryItem, TrainingDistributionItem,
    TrainingFriction, TrainingFrictionCell, TrainingKpis,
    TrainingOutlierItem, TrainingTimelineItem,
)
from app.services.friction import compute_friction
from app.storage.memory import store
from app.transforms.normalize import country_to_iso


def _filter_events(
    date_from: Optional[str], date_to: Optional[str], location: Optional[str]
) -> pd.DataFrame:
    df = store.training_events.copy()
    if date_from:
        df = df[df["started_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["started_at"] <= pd.Timestamp(date_to)]
    if location:
        locs = [l.strip() for l in location.split(",")]
        df = df[df["location"].isin(locs)]
    return df


def _filter_users(
    date_from: Optional[str], date_to: Optional[str], location: Optional[str]
) -> pd.DataFrame:
    df = store.training_users.copy()
    if date_from:
        df = df[df["last_completion_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["last_completion_at"] <= pd.Timestamp(date_to)]
    if location:
        locs = [l.strip() for l in location.split(",")]
        df = df[df["location"].isin(locs)]
    return df


def get_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
) -> TrainingKpis:
    users = _filter_users(date_from, date_to, location)
    events = _filter_events(date_from, date_to, location)

    total_users = len(users)
    total_countries = users[users["location"] != "Sin asignar"]["location"].nunique()
    total_modules = events["module_name"].nunique()
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


def get_by_country(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list[TrainingCountryItem]:
    users = _filter_users(date_from, date_to, None)
    users = users[users["location"] != "Sin asignar"]

    result = []
    for loc, grp in users.groupby("location"):
        avg_score = float(grp["score_pct"].mean())
        avg_completion = float(grp["completion_rate"].mean())
        result.append(TrainingCountryItem(
            location=loc,
            location_iso=country_to_iso(loc),
            user_count=len(grp),
            completion_rate=round(avg_completion, 4),
            avg_score_pct=round(avg_score, 2),
            below_threshold=avg_score < 15.0 and len(grp) > 20,
        ))
    result.sort(key=lambda x: x.user_count, reverse=True)
    return result


def get_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
) -> list[TrainingTimelineItem]:
    users = _filter_users(date_from, date_to, location)
    users = users[users["last_completion_at"].notna()].copy()
    users["month"] = users["last_completion_at"].dt.to_period("M").astype(str)

    result = []
    for month, grp in users.groupby("month"):
        result.append(TrainingTimelineItem(
            month=month,
            completion_rate=round(float(grp["completion_rate"].mean()), 4),
            avg_score_pct=round(float(grp["score_pct"].mean()), 2),
            avg_duration_min=round(float(grp["total_duration_min"].mean()), 1),
        ))
    result.sort(key=lambda x: x.month)
    return result


def get_friction(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
) -> TrainingFriction:
    events = _filter_events(date_from, date_to, location)
    events = events[events["location"] != "Sin asignar"]

    p95 = float(store.training_events["duration_min"].quantile(0.95))

    cells = []
    module_friction: dict[str, list[float]] = {}

    for (module, loc), grp in events.groupby(["module_name", "location"]):
        friction = compute_friction(grp, p95_duration=p95)
        avg_dur = float(grp["duration_min"].mean())
        n_completed = grp["completed_at"].notna().sum()
        incomplete = (len(grp) - n_completed) / len(grp)
        low_sample = len(grp) < LOW_SAMPLE_THRESHOLD

        cells.append(TrainingFrictionCell(
            module_name=module,
            location=loc,
            location_iso=country_to_iso(loc),
            friction_score=friction,
            avg_duration_min=round(avg_dur, 1),
            incomplete_rate=round(float(incomplete), 4),
            user_count=len(grp),
            low_sample=low_sample,
        ))
        if friction is not None:
            module_friction.setdefault(module, []).append(friction)

    # Modules ordered by mean friction desc (top 8)
    module_mean = {m: sum(v) / len(v) for m, v in module_friction.items()}
    top_modules = sorted(module_mean, key=lambda m: module_mean[m], reverse=True)[:8]

    # Countries ordered by event volume desc
    country_counts = events.groupby("location").size().sort_values(ascending=False)
    countries = list(country_counts.index)

    # Filter cells to only top modules
    cells = [c for c in cells if c.module_name in top_modules]

    return TrainingFriction(
        cells=cells,
        modules=top_modules,
        countries=countries,
        p95_duration_global=round(p95, 1),
    )


def get_distribution(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
) -> list[TrainingDistributionItem]:
    users = _filter_users(date_from, date_to, location)
    bins = list(range(0, 110, 10))
    result = []
    for i in range(len(bins) - 1):
        lo, hi = bins[i], bins[i + 1]
        if hi == 100:
            count = int(((users["score_pct"] >= lo) & (users["score_pct"] <= hi)).sum())
        else:
            count = int(((users["score_pct"] >= lo) & (users["score_pct"] < hi)).sum())
        result.append(TrainingDistributionItem(
            bin_start=lo,
            bin_end=hi,
            count=count,
            label=f"{lo}–{hi}%",
        ))
    return result


def get_outliers(
    limit: int = 4,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
) -> list[TrainingOutlierItem]:
    users = _filter_users(date_from, date_to, location)
    p90 = float(users["total_duration_min"].quantile(0.90))
    outliers = users[
        (users["total_duration_min"] > p90) & (users["score_pct"] < 30)
    ].sort_values("total_duration_min", ascending=False).head(limit)

    return [
        TrainingOutlierItem(
            user_id=str(row["user_id"]),
            location=str(row["location"]),
            total_duration_min=int(row["total_duration_min"]),
            score_pct=round(float(row["score_pct"]), 2),
            severity="critical" if row["score_pct"] < 20 else "warning",
        )
        for _, row in outliers.iterrows()
    ]


def get_banner() -> TrainingBanner:
    users = store.training_users
    events = store.training_events

    global_completion = float(users["completion_rate"].mean())

    # Countries below score threshold with enough users
    by_country = users[users["location"] != "Sin asignar"].groupby("location")
    countries_below = sum(
        1 for _, grp in by_country
        if float(grp["score_pct"].mean()) < 15.0 and len(grp) > 20
    )

    # Top friction module (from all events)
    top_module: Optional[str] = None
    p95 = float(events["duration_min"].quantile(0.95))
    module_frictions = {}
    for mod, grp in events.groupby("module_name"):
        f = compute_friction(grp, p95_duration=p95)
        if f is not None:
            module_frictions[mod] = f
    if module_frictions:
        top_module = max(module_frictions, key=lambda m: module_frictions[m])

    if global_completion < 0.50:
        return TrainingBanner(
            severity="critical",
            title=f"Tasa de finalización global crítica: {round(global_completion * 100)}%",
            description="Menos de la mitad de los módulos se completan",
            countries_below_threshold=countries_below,
            top_friction_module=top_module,
            global_completion_rate=round(global_completion, 4),
        )
    if global_completion < 0.70 or countries_below >= 1:
        desc_parts = []
        if countries_below >= 1:
            desc_parts.append(f"{countries_below} países por debajo del umbral de score (15%)")
        if top_module:
            desc_parts.append(f"Mayor fricción: {top_module}")
        return TrainingBanner(
            severity="warning",
            title="Formación por debajo de objetivos",
            description=" · ".join(desc_parts) or "Revisar módulos y países en riesgo",
            countries_below_threshold=countries_below,
            top_friction_module=top_module,
            global_completion_rate=round(global_completion, 4),
        )
    return TrainingBanner(
        severity="ok",
        title="Formación en niveles aceptables",
        description="Todos los países y módulos dentro de umbrales",
        countries_below_threshold=0,
        top_friction_module=top_module,
        global_completion_rate=round(global_completion, 4),
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/training_service.py
git commit -m "feat: implement training service — kpis, by_country, timeline, friction, distribution, outliers, banner"
```

---

## Task 8: Implement ingest router

**Files:**
- Modify: `backend/app/routers/ingest.py`

- [ ] **Step 1: Implement upload handlers**

Replace `backend/app/routers/ingest.py`:

```python
import io
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import DATA_DIR
from app.models.responses import ApiResponse
from app.storage.memory import store
from app.transforms.loaders import load_mdm_xlsx, load_training_xlsx

router = APIRouter(prefix="/ingest", tags=["Ingest"])


def _save_parquet(name: str, df: pd.DataFrame) -> None:
    path = Path(DATA_DIR) / f"{name}.parquet"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)


@router.post("/mdm", response_model=ApiResponse[dict])
async def ingest_mdm(file: UploadFile = File(...)):
    content = await file.read()
    try:
        events, devices, patches = load_mdm_xlsx(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    store.mdm_events = events
    store.mdm_devices = devices
    store.mdm_patches = patches

    _save_parquet("mdm_events", events)
    _save_parquet("mdm_devices", devices)
    _save_parquet("mdm_patches", patches)

    return {"data": {
        "events": len(events),
        "devices": len(devices),
        "patches": len(patches),
    }}


@router.post("/training", response_model=ApiResponse[dict])
async def ingest_training(file: UploadFile = File(...)):
    content = await file.read()
    try:
        events, users = load_training_xlsx(io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    store.training_events = events
    store.training_users = users

    _save_parquet("training_events", events)
    _save_parquet("training_users", users)

    return {"data": {
        "events": len(events),
        "users": len(users),
    }}


@router.get("/status", response_model=ApiResponse[dict])
async def get_ingest_status():
    return {"data": {
        "mdm_loaded": store.mdm_loaded,
        "training_loaded": store.training_loaded,
        "mdm_events": len(store.mdm_events) if store.mdm_loaded else 0,
        "mdm_devices": len(store.mdm_devices) if store.mdm_loaded else 0,
        "training_events": len(store.training_events) if store.training_loaded else 0,
        "training_users": len(store.training_users) if store.training_loaded else 0,
    }}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/ingest.py
git commit -m "feat: implement ingest router — upload, cache, persist to parquet"
```

---

## Task 9: Implement mdm router bodies

**Files:**
- Modify: `backend/app/routers/mdm.py`

- [ ] **Step 1: Implement router bodies**

Replace `backend/app/routers/mdm.py`:

```python
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.models.responses import (
    ApiResponse, MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem,
)
from app.services import mdm_service
from app.storage.memory import store

router = APIRouter(prefix="/mdm", tags=["MDM"])


def _require_mdm():
    if not store.mdm_loaded:
        raise HTTPException(status_code=503, detail="MDM data not loaded. POST /api/v1/ingest/mdm first.")


@router.get("/kpis", response_model=ApiResponse[MDMKpis])
async def get_mdm_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_kpis(date_from, date_to)}


@router.get("/by-office", response_model=ApiResponse[List[MDMOfficeItem]])
async def get_mdm_by_office(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_by_office(date_from, date_to, office)}


@router.get("/top-patches", response_model=ApiResponse[List[MDMPatchItem]])
async def get_mdm_top_patches(
    limit: int = Query(default=5, ge=1, le=50),
):
    _require_mdm()
    return {"data": mdm_service.get_top_patches(limit)}


@router.get("/timeline", response_model=ApiResponse[List[MDMTimelineItem]])
async def get_mdm_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_timeline(date_from, date_to)}


@router.get("/banner", response_model=ApiResponse[MDMBanner])
async def get_mdm_banner():
    _require_mdm()
    return {"data": mdm_service.get_banner()}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/mdm.py
git commit -m "feat: implement MDM router endpoints"
```

---

## Task 10: Fix training router + implement bodies

**Files:**
- Modify: `backend/app/routers/training.py`

The current file imports `TrainingByCountry`, `TrainingDistribution`, `TrainingOutliers`, `TrainingTimeline` which do not exist in responses.py. These must be removed. The `response_model` decorators already use the correct inline types.

- [ ] **Step 1: Replace training router**

Replace `backend/app/routers/training.py`:

```python
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.models.responses import (
    ApiResponse,
    TrainingBanner,
    TrainingCountryItem,
    TrainingDistributionItem,
    TrainingFriction,
    TrainingKpis,
    TrainingOutlierItem,
    TrainingTimelineItem,
)
from app.services import training_service
from app.storage.memory import store

router = APIRouter(prefix="/training", tags=["Training"])


def _require_training():
    if not store.training_loaded:
        raise HTTPException(status_code=503, detail="Training data not loaded. POST /api/v1/ingest/training first.")


@router.get("/kpis", response_model=ApiResponse[TrainingKpis])
async def get_training_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_kpis(date_from, date_to, location)}


@router.get("/by-country", response_model=ApiResponse[List[TrainingCountryItem]])
async def get_training_by_country(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_by_country(date_from, date_to)}


@router.get("/timeline", response_model=ApiResponse[List[TrainingTimelineItem]])
async def get_training_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_timeline(date_from, date_to, location)}


@router.get("/friction", response_model=ApiResponse[TrainingFriction])
async def get_training_friction(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_friction(date_from, date_to, location)}


@router.get("/distribution", response_model=ApiResponse[List[TrainingDistributionItem]])
async def get_training_distribution(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_distribution(date_from, date_to, location)}


@router.get("/outliers", response_model=ApiResponse[List[TrainingOutlierItem]])
async def get_training_outliers(
    limit: int = Query(default=4, ge=1, le=20),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_outliers(limit, date_from, date_to, location)}


@router.get("/banner", response_model=ApiResponse[TrainingBanner])
async def get_training_banner():
    _require_training()
    return {"data": training_service.get_banner()}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/training.py
git commit -m "fix: remove invalid imports from training router; implement all 7 endpoints"
```

---

## Task 11: Add pytest + run all tests + verify endpoints

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add pytest to pyproject.toml**

Add under `[project]`:

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "httpx>=0.27",
]
```

- [ ] **Step 2: Install dev deps with uv**

```bash
cd backend && uv pip install -e ".[dev]"
```

- [ ] **Step 3: Run all tests**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: all tests in `test_caesar.py`, `test_normalize.py`, `test_friction.py` PASS.

- [ ] **Step 4: Start the server**

```bash
cd backend && uv run uvicorn app.main:app --reload --port 8000
```

- [ ] **Step 5: Upload MDM XLSX**

```bash
curl -X POST http://localhost:8000/api/v1/ingest/mdm \
  -F "file=@../data/MDM_DATA.xlsx"
```

Expected response:
```json
{"data": {"events": 655, "devices": 433, "patches": 12}}
```

- [ ] **Step 6: Upload Training XLSX**

```bash
curl -X POST "http://localhost:8000/api/v1/ingest/training" \
  -F "file=@../data/Formación y concienciación.xlsx"
```

Expected response:
```json
{"data": {"events": 10988, "users": 1230}}
```

- [ ] **Step 7: Verify MDM KPIs**

```bash
curl http://localhost:8000/api/v1/mdm/kpis
```

Expected: `{"data": {"completed": 360, "missing": 55, "in_progress": 12, "failed": 6, ...}}`

- [ ] **Step 8: Verify Training KPIs**

```bash
curl http://localhost:8000/api/v1/training/kpis
```

Expected: `{"data": {"total_users": 1230, "total_countries": 16, "total_modules": 23, ...}}`

- [ ] **Step 9: Verify friction has Nicaragua + Phishing avanzado**

```bash
curl "http://localhost:8000/api/v1/training/friction" | python -m json.tool | grep -A5 "Nicaragua"
```

Expected: a cell for "Phishing avanzado" in Nicaragua with `friction_score > 60`.

- [ ] **Step 10: Verify all 13 endpoints return 200**

```bash
for ep in \
  "mdm/kpis" "mdm/by-office" "mdm/top-patches" "mdm/timeline" "mdm/banner" \
  "training/kpis" "training/by-country" "training/timeline" "training/friction" \
  "training/distribution" "training/outliers" "training/banner" \
  "ingest/status"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/v1/$ep")
  echo "$ep → $code"
done
```

Expected: all return `200`.

- [ ] **Step 11: Commit**

```bash
git add backend/pyproject.toml
git commit -m "chore: add pytest dev dependency"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| decode_caesar with 26-letter alphabet | Task 1 |
| Alphabeto castellano incluyendo ñ/Ñ (pass-through) | Task 1 |
| user_score_pct clamped to 100 | Task 2 |
| Location normalization, ISO map | Already in normalize.py (C0) |
| load_mdm — 3 DataFrames | Task 3 |
| load_training — filter Removed, 10988 events, 1230 users | Task 3 |
| Auto-detect Caesar shift if < 80% legible | Task 3 (auto_detect_shift called in loader) |
| DataSource abstract + FileDataSource | Task 4 |
| Cache in app.state / startup reload | Task 4 |
| friction_score formula 0.55/0.45 | Task 5 |
| Friction tests: n=0→None, fast→<30, nobody→≈45 | Task 5 |
| MDM 5 queries (kpis, by_office, top_patches, timeline, banner) | Task 6 |
| Banner logic per spec §4.1 | Task 6 |
| Training 7 queries | Task 7 |
| Outliers: duration>p90 AND score<30, top 4 | Task 7 |
| Distribution: bins of 10 | Task 7 |
| Filter params date_from, date_to, location, office | Tasks 6, 7 |
| 13 REST endpoints, response_model shapes | Tasks 8, 9, 10 |
| No new endpoints (spec §6.3 only) | ✓ |

**Potential issues to watch:**
- Training XLSX filename has non-ASCII characters; use `pathlib.Path` or pass `BytesIO` directly — loader accepts both.
- The `_require_*` guards return 503 before data is loaded; the spec expects 200 only after upload.
- If actual XLSX counts differ from 10,988/1,230, the `ValueError` in loaders tells you the real count. Investigate before adjusting the constants.
