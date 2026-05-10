# syntax=docker/dockerfile:1
# =============================================================================
#  Hint Service (BC-2) — Python + FastAPI + Tree-sitter
#  Multi-stage. Контекст сборки — apps/hint-service.
#
#  Ускорение сборки:
#  - без build-essential: tree-sitter и прочие зависимости ставятся из wheels
#    (--prefer-binary). Если pip попросит компилятор — временно добавьте в RUN ниже:
#    apt-get install -y gcc python3-dev
#  - кэш BuildKit для apt и pip (повторные docker compose build заметно быстрее)
# =============================================================================

FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# Только ca-certificates (десятки KB). Тяжёлый build-essential не нужен при наличии wheels.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------- deps ----------
FROM base AS deps
COPY requirements.txt requirements-dev.txt ./
# Кэш pip между сборками; предпочитаем бинарные колёса (без компиляции из исходников).
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements.txt

# ---------- dev ----------
FROM deps AS dev
ENV ENV=development
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements-dev.txt
COPY . .
EXPOSE 4002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4002", "--reload"]

# ---------- prod ----------
FROM deps AS prod
ENV ENV=production
COPY . .
EXPOSE 4002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4002", "--workers", "2"]
