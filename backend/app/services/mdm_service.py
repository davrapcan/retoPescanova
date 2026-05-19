"""MDM aggregation logic."""
from typing import Optional
import pandas as pd

from app.models.responses import (
    MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem,
)
from app.storage.memory import store

_STATUS_COMPLETED = "Patching Completed"
_STATUS_MISSING = "Patches Missing"
_STATUS_INPROGRESS = "Patching Inprogress"
_STATUS_FAILED = "Patching Failed"


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


def _filter_events(date_from: Optional[str], date_to: Optional[str]) -> pd.DataFrame:
    df = store.mdm_events.copy()
    if date_from:
        df = df[df["deployed_at"] >= pd.Timestamp(date_from)]
    if date_to:
        df = df[df["deployed_at"] <= pd.Timestamp(date_to)]
    return df


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


_MISSING_STATUSES = {"Missing", "Patches Missing"}
_FAILED_STATUSES = {"Failed", "Patching Failed"}
_INSTALLED_STATUSES = {"Installed", "Patching Completed"}


def get_top_patches(
    limit: int = 5,
    office: Optional[str] = None,
    patch_id: Optional[str] = None,
) -> list[MDMPatchItem]:
    patches = store.mdm_patches
    devices = store.mdm_devices

    patch_ids: list[int] = []
    if patch_id:
        patch_ids = [int(p.strip()) for p in patch_id.split(",") if p.strip()]

    if not office:
        df = patches.copy()
        if patch_ids:
            df = df[df["patch_id"].isin(patch_ids)]
        total_devices = len(devices)
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

    # Office-scoped top patches: recompute per-patch counts from events
    # restricted to devices in the selected office.
    offices = [o.strip() for o in office.split(",")]
    office_devices = devices[devices["remote_office_raw"].isin(offices)]
    total_devices = len(office_devices)
    if total_devices == 0:
        return []

    computer_names = set(office_devices["computer_name"])
    events = store.mdm_events
    office_events = events[events["computer_name"].isin(computer_names)].copy()
    if patch_ids:
        office_events = office_events[office_events["patch_id"].isin(patch_ids)]
    if office_events.empty:
        return []

    def classify(status: str) -> str:
        if status in _MISSING_STATUSES:
            return "missing"
        if status in _FAILED_STATUSES:
            return "failed"
        if status in _INSTALLED_STATUSES:
            return "installed"
        return "other"

    office_events["bucket"] = office_events["deployment_status"].map(classify)
    counts = (
        office_events.groupby(["patch_id", "bucket"]).size().unstack(fill_value=0)
    )
    for col in ("missing", "failed", "installed"):
        if col not in counts.columns:
            counts[col] = 0
    counts["risk_score"] = counts["missing"] + counts["failed"] * 2
    counts = counts.sort_values("risk_score", ascending=False).head(limit)

    patch_meta = patches.set_index("patch_id")
    items: list[MDMPatchItem] = []
    for pid, row in counts.iterrows():
        meta = patch_meta.loc[pid] if pid in patch_meta.index else None
        items.append(
            MDMPatchItem(
                patch_id=int(pid),
                bulletin_id=str(meta["bulletin_id"]) if meta is not None else "",
                description=str(meta["description"])
                if meta is not None
                else str(office_events[office_events["patch_id"] == pid]["patch_description"].iloc[0]),
                missing_systems=int(row["missing"]),
                installed_systems=int(row["installed"]),
                failed_systems=int(row["failed"]),
                risk_score=int(row["risk_score"]),
                total_devices=total_devices,
            )
        )
    return items


def get_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
) -> list[MDMTimelineItem]:
    df = _filter_events(date_from, date_to).copy()
    if office:
        offices = [o.strip() for o in office.split(",")]
        office_devices = store.mdm_devices[
            store.mdm_devices["remote_office_raw"].isin(offices)
        ]
        df = df[df["computer_name"].isin(office_devices["computer_name"])]
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

    top_office: Optional[str] = None
    if failed_count > 0:
        failed_by_office = (
            df[df["patching_status"] == _STATUS_FAILED]
            .groupby("remote_office_raw")
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
