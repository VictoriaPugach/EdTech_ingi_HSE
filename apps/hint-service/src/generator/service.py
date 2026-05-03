"""Основной use-case: получить код → выдать подсказки."""

from __future__ import annotations

import time

from ..analyzer.detector import DetectedError, detect_all
from ..schemas import Hint, HintErrorType, HintRequest, HintResponse
from .templates import render


def _to_hint(err: DetectedError, age: int | None) -> Hint:
    message, cue = render(err.error_type, symbol=err.symbol, age=age)
    return Hint(
        error_type=err.error_type,
        message=message,
        location=err.location,
        visual_cue=cue,
    )


def generate_hints(req: HintRequest) -> HintResponse:
    started = time.perf_counter_ns()

    if req.error_type is not None:
        # Прямой запрос подсказки по конкретному типу (например, нажатие кнопки «Помощь»)
        message, cue = render(req.error_type, age=req.user_age)
        hint = Hint(
            error_type=req.error_type,
            message=message,
            location={"line": 1, "column": 1},  # type: ignore[arg-type]
            visual_cue=cue,
        )
        elapsed_ms = (time.perf_counter_ns() - started) // 1_000_000
        return HintResponse(hints=[hint], processing_time_ms=int(elapsed_ms))

    detected = detect_all(req.code, req.language)
    hints = [_to_hint(e, req.user_age) for e in detected]

    elapsed_ms = (time.perf_counter_ns() - started) // 1_000_000
    return HintResponse(hints=hints, processing_time_ms=int(elapsed_ms))


__all__ = ["generate_hints", "HintErrorType"]
