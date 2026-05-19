FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    "uvicorn[standard]==0.29.0" \
    pandas==2.2.2 \
    openpyxl==3.1.2 \
    "pydantic>=2.0.0" \
    python-multipart==0.0.9 \
    pyarrow==16.0.0

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
