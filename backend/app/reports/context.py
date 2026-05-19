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
