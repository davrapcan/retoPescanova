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
    office: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_kpis(date_from, date_to, office)}


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
    office: Optional[str] = None,
    patch_id: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_top_patches(limit, office, patch_id)}


@router.get("/timeline", response_model=ApiResponse[List[MDMTimelineItem]])
async def get_mdm_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
):
    _require_mdm()
    return {"data": mdm_service.get_timeline(date_from, date_to, office)}


@router.get("/banner", response_model=ApiResponse[MDMBanner])
async def get_mdm_banner():
    _require_mdm()
    return {"data": mdm_service.get_banner()}
