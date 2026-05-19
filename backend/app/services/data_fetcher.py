"""Fetches Excel files from DATA_API_URL and loads them into the store."""
import base64
import io
from pathlib import Path

import httpx
import pandas as pd

from app.config import DATA_API_URL, DATA_DIR
from app.storage.memory import store
from app.transforms.loaders import load_mdm_xlsx, load_training_xlsx


def _save_parquet(name: str, df: pd.DataFrame) -> None:
    path = Path(DATA_DIR) / f"{name}.parquet"
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)


async def load_from_api() -> tuple[bool, bool]:
    """Fetch MDM and Training from DATA_API_URL. Returns (mdm_ok, training_ok)."""
    if not DATA_API_URL:
        return False, False

    mdm_ok = training_ok = False
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.get(f"{DATA_API_URL}/mdm")
            r.raise_for_status()
            content = base64.b64decode(r.json()["content"])
            events, devices, patches = load_mdm_xlsx(io.BytesIO(content))
            _save_parquet("mdm_events", events)
            _save_parquet("mdm_devices", devices)
            _save_parquet("mdm_patches", patches)
            store.mdm_events = events
            store.mdm_devices = devices
            store.mdm_patches = patches
            mdm_ok = True
            print("[data_fetcher] MDM cargado desde data API")
        except Exception as exc:
            print(f"[data_fetcher] MDM error: {exc}")

        try:
            r = await client.get(f"{DATA_API_URL}/training")
            r.raise_for_status()
            content = base64.b64decode(r.json()["content"])
            events, users = load_training_xlsx(io.BytesIO(content))
            _save_parquet("training_events", events)
            _save_parquet("training_users", users)
            store.training_events = events
            store.training_users = users
            training_ok = True
            print("[data_fetcher] Training cargado desde data API")
        except Exception as exc:
            print(f"[data_fetcher] Training error: {exc}")

    return mdm_ok, training_ok
