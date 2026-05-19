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
    TrainingUserItem,
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


@router.get("/users", response_model=ApiResponse[List[TrainingUserItem]])
async def get_training_users(
    sort: str = Query(default="worst", pattern="^(best|worst)$"),
    limit: int = Query(default=50, ge=1, le=500),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    _require_training()
    return {"data": training_service.get_users(sort, limit, date_from, date_to, location)}


@router.get("/banner", response_model=ApiResponse[TrainingBanner])
async def get_training_banner():
    _require_training()
    return {"data": training_service.get_banner()}


@router.get("/modules", response_model=ApiResponse[List[str]])
async def get_training_modules():
    _require_training()
    return {"data": training_service.list_modules()}
