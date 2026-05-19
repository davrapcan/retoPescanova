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

    by_country = users[users["location"] != "Sin asignar"].groupby("location")
    countries_below = sum(
        1 for _, grp in by_country
        if float(grp["score_pct"].mean()) < 15.0 and len(grp) > 20
    )

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
