"""Microservicio que sirve los ficheros Excel como JSON base64.

Ejecutar en puerto 8001:
    DATA_DIR=../data uv run uvicorn data_api.main:app --port 8001

Endpoints:
    GET /health          → {"status": "ok"}
    GET /mdm             → Excel MDM como base64
    GET /training        → Excel Formación como base64
"""
import base64
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

DATA_DIR = Path(os.getenv("DATA_DIR", "../data"))

app = FastAPI(title="Pescanova Data API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _serve_excel(filename: str) -> dict:
    path = DATA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{filename} not found (DATA_DIR={DATA_DIR})")
    content = path.read_bytes()
    return {
        "filename": filename,
        "content": base64.b64encode(content).decode(),
        "encoding": "base64",
        "size": len(content),
    }


@app.get("/health")
def health():
    return {"status": "ok", "data_dir": str(DATA_DIR.resolve())}


@app.get("/mdm")
def get_mdm():
    return _serve_excel("MDM_DATA.xlsx")


@app.get("/training")
def get_training():
    return _serve_excel("Formación y concienciación.xlsx")
