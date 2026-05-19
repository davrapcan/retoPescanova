"""XLSX ingestion and cleaning — stub, to be implemented in C1."""
import pandas as pd


def load_mdm_xlsx(path: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Returns (mdm_events, mdm_devices, mdm_patches)."""
    raise NotImplementedError


def load_training_xlsx(path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (training_events, training_users) with Removed rows filtered."""
    raise NotImplementedError
