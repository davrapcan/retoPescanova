import os

DATA_DIR = os.getenv("DATA_DIR", "/app/data")
DATA_API_URL = os.getenv("DATA_API_URL", "")  # e.g. "http://localhost:8001"
FRICTION_WEIGHT_DURATION = float(os.getenv("FRICTION_WEIGHT_DURATION", "0.55"))
FRICTION_WEIGHT_INCOMPLETE = float(os.getenv("FRICTION_WEIGHT_INCOMPLETE", "0.45"))
P95_DURATION_GLOBAL_MIN = float(os.getenv("P95_DURATION_GLOBAL_MIN", "13.0"))
LOW_SAMPLE_THRESHOLD = int(os.getenv("LOW_SAMPLE_THRESHOLD", "5"))
