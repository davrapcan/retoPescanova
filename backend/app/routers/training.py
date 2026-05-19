from fastapi import APIRouter, Query
from typing import List, Optional

from app.models.responses import (
    ApiResponse,
    TrainingBanner,
    TrainingByCountry,
    TrainingCountryItem,
    TrainingDistribution,
    TrainingDistributionItem,
    TrainingFriction,
    TrainingKpis,
    TrainingOutlierItem,
    TrainingOutliers,
    TrainingTimeline,
    TrainingTimelineItem,
)

router = APIRouter(prefix="/training", tags=["Training"])


@router.get("/kpis", response_model=ApiResponse[TrainingKpis])
async def get_training_kpis(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/by-country", response_model=ApiResponse[List[TrainingCountryItem]])
async def get_training_by_country(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/timeline", response_model=ApiResponse[List[TrainingTimelineItem]])
async def get_training_timeline(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/friction", response_model=ApiResponse[TrainingFriction])
async def get_training_friction(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/distribution", response_model=ApiResponse[List[TrainingDistributionItem]])
async def get_training_distribution(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/outliers", response_model=ApiResponse[List[TrainingOutlierItem]])
async def get_training_outliers(
    limit: int = Query(default=4, ge=1, le=20),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    location: Optional[str] = None,
):
    return {"data": None, "todo": "C1"}


@router.get("/banner", response_model=ApiResponse[TrainingBanner])
async def get_training_banner():
    return {"data": None, "todo": "C1"}
