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
        raise HTTPException(
            status_code=422,
            detail=exc.errors(include_context=False, include_url=False),
        )


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
        raise HTTPException(
            status_code=422,
            detail=exc.errors(include_context=False, include_url=False),
        )


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
