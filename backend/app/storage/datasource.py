from abc import ABC, abstractmethod
from pathlib import Path
import pandas as pd


class DataSource(ABC):
    @abstractmethod
    def load_mdm_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_devices(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_patches(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_users(self) -> pd.DataFrame: ...


class FileDataSource(DataSource):
    """Reads DataFrames from parquet files cached after upload."""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)

    def _read(self, name: str) -> pd.DataFrame:
        path = self.data_dir / f"{name}.parquet"
        if not path.exists():
            raise FileNotFoundError(f"Parquet not found: {path}")
        return pd.read_parquet(path)

    def load_mdm_events(self) -> pd.DataFrame:
        return self._read("mdm_events")

    def load_mdm_devices(self) -> pd.DataFrame:
        return self._read("mdm_devices")

    def load_mdm_patches(self) -> pd.DataFrame:
        return self._read("mdm_patches")

    def load_training_events(self) -> pd.DataFrame:
        return self._read("training_events")

    def load_training_users(self) -> pd.DataFrame:
        return self._read("training_users")


class APIDataSource(DataSource):
    """Stub V2: reads from ManageEngine and LMS live APIs."""

    def load_mdm_events(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_mdm_devices(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_mdm_patches(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_training_events(self) -> pd.DataFrame:
        raise NotImplementedError

    def load_training_users(self) -> pd.DataFrame:
        raise NotImplementedError
