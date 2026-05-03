"""FastAPI entry point. REST API подсказок (BC-2)."""

from __future__ import annotations

import time

from fastapi import FastAPI

from .generator.service import generate_hints
from .schemas import Health, HintRequest, HintResponse

started_at = time.time()

app = FastAPI(
    title="EdTech Collab — Hint Service",
    description="BC-2 Pedagogical Analysis. AST-анализ кода и генерация подсказок для детей.",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(uptime_sec=int(time.time() - started_at))


@app.post("/api/hints", response_model=HintResponse, response_model_by_alias=True)
def hints(req: HintRequest) -> HintResponse:
    return generate_hints(req)
