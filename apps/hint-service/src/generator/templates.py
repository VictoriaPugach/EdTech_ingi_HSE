"""Шаблоны подсказок, адаптированные под детское восприятие.

Принципы (Proposal §1.4.1, ФТ-8):
- краткость (≤ 150 символов);
- конкретность (что именно не так);
- знакомые понятия (без техжаргона: AST/токен/парсер запрещены);
- дружелюбный тон, без слов «ошибка», «неверно», «провал»;
- использование метафор по возрасту (для младших — образы; для старших — короткие подсказки).

Внешний LLM (YandexGPT) подключается на следующей итерации; для MVP достаточно
шаблонов (детерминированно, быстро <2с — KPI).
"""

from __future__ import annotations

from ..schemas import HintErrorType, VisualCue


def _age_tone(age: int | None) -> str:
    """Возвращает префикс по возрасту: «образный» для младших, «дружеский» для старших."""
    if age is None:
        return ""
    if age <= 9:
        return "Кажется, забылась "
    if age <= 13:
        return "Похоже, не хватает "
    return "Маленькая деталь: не закрыта "


def render(
    error_type: HintErrorType, *, symbol: str | None = None, age: int | None = None
) -> tuple[str, VisualCue]:
    """Возвращает (текст, способ визуальной привязки)."""

    if error_type == "syntax/unmatched_paren":
        prefix = _age_tone(age) or "Похоже, не хватает "
        return f"{prefix}закрывающей скобки  ).  Найди парную и добавь её.", "highlight"

    if error_type == "syntax/unmatched_bracket":
        prefix = _age_tone(age) or "Похоже, не хватает "
        return f"{prefix}квадратной скобки  ].  Поставь её в нужном месте.", "highlight"

    if error_type == "syntax/unmatched_quote":
        return (
            "Кажется, кавычки открылись, но не закрылись. Добавь парную кавычку, "
            "чтобы текст внутри был «в обнимку».",
            "highlight",
        )

    if error_type == "syntax/missing_colon":
        return (
            "После  if  /  for  /  def  должно идти двоеточие  :  — "
            "оно говорит Python’у, что дальше будет блок.",
            "inline",
        )

    if error_type == "syntax/invalid_indentation":
        return (
            "Строки внутри блока должны начинаться с одинакового отступа — "
            "обычно это 4 пробела.",
            "inline",
        )

    if error_type == "semantic/undefined_variable":
        if symbol:
            return (
                f"Имя  {symbol}  ещё нигде не объявлено. "
                f"Создай его строкой выше:  {symbol} = ...",
                "tooltip",
            )
        return ("Эта переменная ещё нигде не объявлена. Создай её строкой выше.", "tooltip")

    if error_type == "semantic/undefined_function":
        if symbol:
            return (
                f"Функция  {symbol}  ещё не объявлена. Создай её через  def  {symbol}(...) :",
                "tooltip",
            )
        return ("Эта функция ещё не объявлена.", "tooltip")

    return (
        "Что-то выглядит непривычно. Перечитай эту строку — возможно, потерялся символ.",
        "tooltip",
    )
