from abc import ABC, abstractmethod
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
    """Reads DataFrames from cached parquet files after upload."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir

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
