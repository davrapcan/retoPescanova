"""XLSX ingestion and cleaning."""
import io
import re
import pandas as pd

from app.transforms.caesar import decode_caesar, auto_detect_shift
from app.transforms.normalize import normalize_location, user_score_pct

EXPECTED_EVENTS = 10_988
EXPECTED_USERS = 1_230


def load_mdm_xlsx(path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Returns (mdm_events, mdm_devices, mdm_patches)."""
    events = pd.read_excel(path, sheet_name=0)
    devices = pd.read_excel(path, sheet_name=1)
    patches = pd.read_excel(path, sheet_name=2)

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
    events_raw = pd.read_excel(path, sheet_name=0)
    users_raw = pd.read_excel(path, sheet_name=1)

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
