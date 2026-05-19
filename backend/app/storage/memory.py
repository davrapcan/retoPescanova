"""In-memory cache for DataFrames after upload."""
from typing import Optional
import pandas as pd


class InMemoryStore:
    mdm_events: Optional[pd.DataFrame] = None
    mdm_devices: Optional[pd.DataFrame] = None
    mdm_patches: Optional[pd.DataFrame] = None
    training_events: Optional[pd.DataFrame] = None
    training_users: Optional[pd.DataFrame] = None

    @property
    def mdm_loaded(self) -> bool:
        return self.mdm_events is not None

    @property
    def training_loaded(self) -> bool:
        return self.training_events is not None


store = InMemoryStore()
