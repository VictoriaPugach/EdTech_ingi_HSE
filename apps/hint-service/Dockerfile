# =============================================================================
#  Hint Service (BC-2) — Python + FastAPI + Tree-sitter
#  Multi-stage. Контекст сборки — apps/hint-service.
# =============================================================================

FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential curl \
 && rm -rf /var/lib/apt/lists/*

# ---------- deps ----------
FROM base AS deps
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements.txt

# ---------- dev ----------
FROM deps AS dev
ENV ENV=development
RUN pip install -r requirements-dev.txt
COPY . .
EXPOSE 4002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4002", "--reload"]

# ---------- prod ----------
FROM deps AS prod
ENV ENV=production
COPY . .
EXPOSE 4002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4002", "--workers", "2"]
