from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DATA_DIR
from app.routers import mdm, training, ingest
from app.storage.memory import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: try to reload parquet files persisted from previous uploads
    data_path = Path(DATA_DIR)
    try:
        import pandas as pd
        needed_mdm = ["mdm_events", "mdm_devices", "mdm_patches"]
        needed_training = ["training_events", "training_users"]
        if all((data_path / f"{n}.parquet").exists() for n in needed_mdm):
            store.mdm_events = pd.read_parquet(data_path / "mdm_events.parquet")
            store.mdm_devices = pd.read_parquet(data_path / "mdm_devices.parquet")
            store.mdm_patches = pd.read_parquet(data_path / "mdm_patches.parquet")
        if all((data_path / f"{n}.parquet").exists() for n in needed_training):
            store.training_events = pd.read_parquet(data_path / "training_events.parquet")
            store.training_users = pd.read_parquet(data_path / "training_users.parquet")
    except Exception as exc:
        print(f"[startup] Could not reload parquet: {exc}")
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


@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs"}
