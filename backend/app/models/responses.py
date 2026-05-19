"""
Pydantic response schemas — espejo exacto de frontend/lib/types.ts.
"""
from typing import Generic, List, Literal, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    meta: Optional[dict] = None
    todo: Optional[str] = None


# ─── MDM ─────────────────────────────────────────────────────────────────────

class MDMKpis(BaseModel):
    completed: int
    missing: int
    in_progress: int
    failed: int
    total: int
    completed_pct: float
    missing_pct: float
    in_progress_pct: float
    failed_pct: float


class MDMOfficeItem(BaseModel):
    office: str
    office_code: str
    completed: int
    missing: int
    in_progress: int
    failed: int
    total: int


class MDMPatchItem(BaseModel):
    patch_id: int
    bulletin_id: str
    description: str
    missing_systems: int
    installed_systems: int
    failed_systems: int
    risk_score: int
    total_devices: int


class MDMTimelineItem(BaseModel):
    date: str
    installed: int
    delay_in_deployment: int
    reboot_pending: int
    failed: int


class MDMBanner(BaseModel):
    severity: Literal["ok", "warning", "critical"]
    title: str
    description: str
    failed_count: int
    missing_count: int
    top_office: Optional[str] = None


# ─── Training ─────────────────────────────────────────────────────────────────

class TrainingKpis(BaseModel):
    total_users: int
    total_countries: int
    total_modules: int
    completion_rate: float
    completion_rate_delta: Optional[float] = None
    avg_score_pct: float
    avg_duration_min: float
    avg_duration_delta: Optional[float] = None


class TrainingCountryItem(BaseModel):
    location: str
    location_iso: str
    user_count: int
    completion_rate: float
    avg_score_pct: float
    below_threshold: bool


class TrainingTimelineItem(BaseModel):
    month: str
    completion_rate: float
    avg_score_pct: float
    avg_duration_min: float


class TrainingFrictionCell(BaseModel):
    module_name: str
    location: str
    location_iso: str
    friction_score: Optional[float] = None
    avg_duration_min: float
    incomplete_rate: float
    user_count: int
    low_sample: bool


class TrainingFriction(BaseModel):
    cells: List[TrainingFrictionCell]
    modules: List[str]
    countries: List[str]
    p95_duration_global: float


class TrainingDistributionItem(BaseModel):
    bin_start: int
    bin_end: int
    count: int
    label: str


class TrainingOutlierItem(BaseModel):
    user_id: str
    location: str
    total_duration_min: int
    score_pct: float
    severity: Literal["critical", "warning"]


class TrainingBanner(BaseModel):
    severity: Literal["ok", "warning", "critical"]
    title: str
    description: str
    countries_below_threshold: int
    top_friction_module: Optional[str] = None
    global_completion_rate: float


class TrainingUserItem(BaseModel):
    user_id: str
    location: str
    score_pct: float
    completion_rate: float
    total_duration_min: int
    modules_completed: int
    modules_assigned: int
