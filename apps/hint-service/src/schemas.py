"""Pydantic-модели для REST API. Должны совпадать с packages/shared/src/index.ts."""

from typing import Literal

from pydantic import BaseModel, Field

# Строго: типы ошибок согласованы с HintErrorType в packages/shared/src/index.ts (TC-05/TC-06).
HintErrorType = Literal[
    "syntax/unmatched_paren",
    "syntax/unmatched_bracket",
    "syntax/unmatched_quote",
    "syntax/missing_colon",
    "syntax/invalid_indentation",
    "semantic/undefined_variable",
    "semantic/undefined_function",
    "unknown",
]

SessionLanguage = Literal["python", "javascript"]
VisualCue = Literal["highlight", "inline", "tooltip"]


class CodeLocation(BaseModel):
    line: int = Field(..., ge=1, description="1-based line number")
    column: int = Field(..., ge=1, description="1-based column number")


class HintRequest(BaseModel):
    code: str
    language: SessionLanguage
    user_age: int | None = Field(default=None, ge=5, le=100, alias="userAge")
    error_type: HintErrorType | None = Field(default=None, alias="errorType")

    model_config = {"populate_by_name": True}


class Hint(BaseModel):
    error_type: HintErrorType = Field(..., serialization_alias="errorType")
    message: str = Field(..., max_length=200)
    location: CodeLocation
    visual_cue: VisualCue = Field(..., serialization_alias="visualCue")


class HintResponse(BaseModel):
    hints: list[Hint]
    processing_time_ms: int = Field(..., serialization_alias="processingTimeMs")


class Health(BaseModel):
    status: Literal["ok", "degraded", "down"] = "ok"
    service: str = "hint-service"
    version: str = "0.1.0"
    uptime_sec: int = Field(..., serialization_alias="uptimeSec")
