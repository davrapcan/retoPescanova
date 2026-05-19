from fastapi import APIRouter, UploadFile, File
from app.models.responses import ApiResponse

router = APIRouter(prefix="/ingest", tags=["Ingest"])


@router.post("/mdm", response_model=ApiResponse[dict])
async def ingest_mdm(file: UploadFile = File(...)):
    return {"data": None, "todo": "C1"}


@router.post("/training", response_model=ApiResponse[dict])
async def ingest_training(file: UploadFile = File(...)):
    return {"data": None, "todo": "C1"}


@router.get("/status", response_model=ApiResponse[dict])
async def get_ingest_status():
    return {"data": {"mdm_loaded": False, "training_loaded": False}, "todo": "C1"}
