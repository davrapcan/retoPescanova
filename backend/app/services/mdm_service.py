"""MDM aggregation logic — stub, to be implemented in C1."""
from app.storage.memory import store


def get_kpis():
    raise NotImplementedError


def get_by_office():
    raise NotImplementedError


def get_top_patches(limit: int = 5):
    raise NotImplementedError


def get_timeline():
    raise NotImplementedError


def get_banner():
    raise NotImplementedError
