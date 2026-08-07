# syntax=docker/dockerfile:1
# =============================================================================
#  Telegram Bot — Python + aiogram 3, long polling
#  Multi-stage. Контекст сборки — apps/telegram-bot.
#
#  Ускорение сборки:
#  - без build-essential: зависимости ставятся из wheels (--prefer-binary)
#  - кэш BuildKit для apt и pip (повторные docker compose build заметно быстрее)
# =============================================================================

FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------- deps ----------
FROM base AS deps
COPY requirements.txt requirements-dev.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements.txt

# ---------- dev ----------
FROM deps AS dev
ENV ENV=development
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements-dev.txt
COPY . .
CMD ["python", "-m", "src.main"]

# ---------- prod ----------
FROM deps AS prod
ENV ENV=production
COPY . .
CMD ["python", "-m", "src.main"]
