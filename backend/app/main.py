from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DATA_API_URL, DATA_DIR
from app.routers import ingest, mdm, reports, training
from app.services.data_fetcher import load_from_api
from app.storage.memory import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    mdm_ok = training_ok = False

    # 1. Intentar cargar desde data API si está configurada
    if DATA_API_URL:
        try:
            mdm_ok, training_ok = await load_from_api()
        except Exception as exc:
            print(f"[startup] Data API no disponible: {exc}")

    # 2. Fallback: parquets del disco
    data_path = Path(DATA_DIR)
    try:
        if not mdm_ok:
            needed = ["mdm_events", "mdm_devices", "mdm_patches"]
            if all((data_path / f"{n}.parquet").exists() for n in needed):
                store.mdm_events = pd.read_parquet(data_path / "mdm_events.parquet")
                store.mdm_devices = pd.read_parquet(data_path / "mdm_devices.parquet")
                store.mdm_patches = pd.read_parquet(data_path / "mdm_patches.parquet")
                print("[startup] MDM cargado desde parquet")
        if not training_ok:
            needed = ["training_events", "training_users"]
            if all((data_path / f"{n}.parquet").exists() for n in needed):
                store.training_events = pd.read_parquet(data_path / "training_events.parquet")
                store.training_users = pd.read_parquet(data_path / "training_users.parquet")
                print("[startup] Training cargado desde parquet")
    except Exception as exc:
        print(f"[startup] Error cargando parquet: {exc}")

    yield


app = FastAPI(
    title="Pescanova Cyber Risk Cockpit API",
    version="0.1.0",
    description="Backend para el cuadro de mando de ciberseguridad de Nueva Pescanova.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1")
app.include_router(mdm.router, prefix="/api/v1")
app.include_router(training.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs"}
