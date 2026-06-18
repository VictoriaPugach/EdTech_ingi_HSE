"""Точный детектор синтаксических ошибок Python через стандартный компилятор.

`compile(code, ..., "exec")` только разбирает код (НЕ выполняет — безопасно) и при
ошибке поднимает SyntaxError/IndentationError с точными строкой/столбцом и текстом.
Это надёжнее эвристик по дереву для длинного хвоста типовых ошибок новичков:
отступы, незакрытые скобки/строки, `print` в стиле Python 2 и т. п.

Покрываемые сообщения мапятся в утверждённый справочник HintErrorType; там, где
у нас нет подходящего типа (например, print без скобок), отдаём детский текст
напрямую через DetectedError.message, а тип оставляем «unknown».
"""

from __future__ import annotations

from ..schemas import CodeLocation, HintErrorType
from .detector import DetectedError


def _classify(msg: str) -> tuple[HintErrorType, str | None]:
    """По тексту SyntaxError возвращает (тип ошибки, готовый текст | None).

    None во втором элементе означает «использовать шаблон по типу» (templates.py).
    """
    m = msg.lower()

    # Незакрытые скобки разных видов.
    if "never closed" in m or "was never closed" in m:
        if "[" in m:
            return "syntax/unmatched_bracket", None
        return "syntax/unmatched_paren", None

    # Незакрытая строка.
    if "unterminated string" in m or "eol while scanning string literal" in m:
        return "syntax/unmatched_quote", None

    # Пропущенное двоеточие после if/for/def/while/...
    if "expected ':'" in m:
        return "syntax/missing_colon", None

    # Отступы.
    if "indent" in m:  # unexpected indent / expected an indented block / unindent ...
        return "syntax/invalid_indentation", None

    # print в стиле Python 2 — очень частая ошибка новичков.
    if "missing parentheses in call to 'print'" in m or "missing parentheses in call" in m:
        return (
            "unknown",
            "В Python 3 print — это функция. Оберни то, что печатаешь, в скобки: " 'print("...").',
        )

    # Незакрытая скобка как «unexpected EOF».
    if "unexpected eof" in m:
        return "syntax/unmatched_paren", None

    # Остальное — общий случай (шаблон «что-то выглядит непривычно»).
    return "unknown", None


def detect_python_syntax(code: str) -> list[DetectedError]:
    """Возвращает первую синтаксическую ошибку Python (если есть)."""
    try:
        compile(code, "<student>", "exec")
        return []
    except SyntaxError as e:  # IndentationError — подкласс SyntaxError
        line = e.lineno or 1
        col = e.offset or 1
        etype, message = _classify(e.msg or "")
        return [
            DetectedError(
                error_type=etype,
                location=CodeLocation(line=max(1, line), column=max(1, col)),
                message=message,
            )
        ]
    except (ValueError, TypeError):
        # Например, нулевые байты в исходнике — не наша ошибка для подсказки.
        return []
