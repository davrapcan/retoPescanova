import io
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import DATA_API_URL, DATA_DIR
from app.models.responses import ApiResponse
from app.storage.memory import store
from app.transforms.loaders import load_mdm_xlsx, load_training_xlsx

router = APIRouter(prefix="/ingest", tags=["Ingest"])


def _save_parquet(name: str, df: pd.DataFrame) -> None:
    path = Path(DATA_DIR) / f"{name}.parquet"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)


@router.post("/mdm", response_model=ApiResponse[dict])
async def ingest_mdm(file: UploadFile = File(...)):
    content = await file.read()
    try:
        events, devices, patches = load_mdm_xlsx(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    _save_parquet("mdm_events", events)
    _save_parquet("mdm_devices", devices)
    _save_parquet("mdm_patches", patches)

    store.mdm_events = events
    store.mdm_devices = devices
    store.mdm_patches = patches

    return {"data": {
        "events": len(events),
        "devices": len(devices),
        "patches": len(patches),
    }}


@router.post("/training", response_model=ApiResponse[dict])
async def ingest_training(file: UploadFile = File(...)):
    content = await file.read()
    try:
        events, users = load_training_xlsx(io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    _save_parquet("training_events", events)
    _save_parquet("training_users", users)

    store.training_events = events
    store.training_users = users

    return {"data": {
        "events": len(events),
        "users": len(users),
    }}


@router.post("/reload", response_model=ApiResponse[dict])
async def reload_from_api():
    """Recarga MDM y Training desde DATA_API_URL sin necesidad de subir ficheros."""
    if not DATA_API_URL:
        raise HTTPException(status_code=503, detail="DATA_API_URL no configurada.")
    from app.services.data_fetcher import load_from_api
    try:
        mdm_ok, training_ok = await load_from_api()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error al contactar con la data API: {exc}")
    return {"data": {"mdm_reloaded": mdm_ok, "training_reloaded": training_ok}}


@router.get("/status", response_model=ApiResponse[dict])
async def get_ingest_status():
    return {"data": {
        "mdm_loaded": store.mdm_loaded,
        "training_loaded": store.training_loaded,
        "mdm_events": len(store.mdm_events) if store.mdm_loaded else 0,
        "mdm_devices": len(store.mdm_devices) if store.mdm_loaded else 0,
        "training_events": len(store.training_events) if store.training_loaded else 0,
        "training_users": len(store.training_users) if store.training_loaded else 0,
    }}
