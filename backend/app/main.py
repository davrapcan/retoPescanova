from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import mdm, training, ingest

app = FastAPI(
    title="Pescanova Cyber Risk Cockpit API",
    version="0.1.0",
    description="Backend para el cuadro de mando de ciberseguridad de Nueva Pescanova.",
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
