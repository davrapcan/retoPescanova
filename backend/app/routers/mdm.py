from fastapi import APIRouter, Query
from typing import List, Optional

from app.models.responses import (
    ApiResponse,
    MDMBanner,
    MDMKpis,
    MDMOfficeItem,
    MDMPatchItem,
    MDMTimelineItem,
)

router = APIRouter(prefix="/mdm", tags=["MDM"])


@router.get("/kpis", response_model=ApiResponse[MDMKpis])
async def get_mdm_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/by-office", response_model=ApiResponse[List[MDMOfficeItem]])
async def get_mdm_by_office(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    office: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/top-patches", response_model=ApiResponse[List[MDMPatchItem]])
async def get_mdm_top_patches(
    limit: int = Query(default=5, ge=1, le=50),
):
    return {"data": None, "todo": "C1"}


@router.get("/timeline", response_model=ApiResponse[List[MDMTimelineItem]])
async def get_mdm_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/banner", response_model=ApiResponse[MDMBanner])
async def get_mdm_banner():
    return {"data": None, "todo": "C1"}
