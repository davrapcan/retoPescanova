FROM python:3.12-slim

WORKDIR /app

# WeasyPrint native dependencies + a sensible default font.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi==0.110.0 \
    "uvicorn[standard]==0.29.0" \
    pandas==2.2.2 \
    openpyxl==3.1.2 \
    "pydantic>=2.0.0" \
    python-multipart==0.0.9 \
    pyarrow==16.0.0 \
    "httpx>=0.28.0" \
    "weasyprint>=63.0" \
    jinja2==3.1.4

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
