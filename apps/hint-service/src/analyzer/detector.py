"""Детектор типовых ошибок начинающих программистов.

MVP-набор:
- syntax/unmatched_paren     (TC-05)
- syntax/unmatched_bracket
- syntax/unmatched_quote
- syntax/missing_colon       (Python: forgot ':' after `if`/`for`/`def`)
- semantic/undefined_variable (TC-06, простой scope-анализ для Python)

Расширение списка — следующая итерация.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..schemas import CodeLocation, HintErrorType
from .parser import parse


@dataclass
class DetectedError:
    error_type: HintErrorType
    location: CodeLocation
    symbol: str | None = None


# ----------------------------------------------------------------------------
# Синтаксические ошибки — обходим Tree-sitter дерево, ищем ERROR / MISSING узлы
# ----------------------------------------------------------------------------


def _walk_errors(node, errors: list[DetectedError]) -> None:
    if node.is_error or node.is_missing:
        text = (node.text or b"").decode("utf-8", errors="replace")
        line = node.start_point[0] + 1
        col = node.start_point[1] + 1
        loc = CodeLocation(line=line, column=col)

        # Грубая классификация по содержимому ERROR-узла
        if "(" in text and ")" not in text:
            err: HintErrorType = "syntax/unmatched_paren"
        elif "[" in text and "]" not in text:
            err = "syntax/unmatched_bracket"
        elif text.count('"') % 2 == 1 or text.count("'") % 2 == 1:
            err = "syntax/unmatched_quote"
        elif node.is_missing and node.type == ":":
            err = "syntax/missing_colon"
        else:
            err = "unknown"

        errors.append(DetectedError(error_type=err, location=loc))
        return  # дочерние не обходим — родитель уже захватил всю проблему

    for child in node.children:
        _walk_errors(child, errors)


def detect_syntax_errors(code: str, language: str) -> list[DetectedError]:
    tree = parse(code, language)
    errors: list[DetectedError] = []
    _walk_errors(tree.root_node, errors)
    return errors


# ----------------------------------------------------------------------------
# Семантика: undefined variable (грубый детектор для Python)
# ----------------------------------------------------------------------------


def _collect_python_identifiers(node, defined: set[str], used: list[tuple[str, int, int]]) -> None:
    """Очень упрощённо: имена в LHS присваивания / параметры функций → defined.
    Имена в выражениях → used. Без учёта scope (для MVP достаточно)."""
    if node.type == "assignment":
        # left = node.child_by_field_name("left")
        left = node.child_by_field_name("left")
        if left is not None and left.type == "identifier":
            defined.add(left.text.decode("utf-8"))
    elif node.type == "parameters":
        for child in node.children:
            if child.type == "identifier":
                defined.add(child.text.decode("utf-8"))
    elif node.type == "function_definition":
        name = node.child_by_field_name("name")
        if name is not None:
            defined.add(name.text.decode("utf-8"))
    elif node.type == "for_statement":
        left = node.child_by_field_name("left")
        if left is not None and left.type == "identifier":
            defined.add(left.text.decode("utf-8"))
    elif node.type == "import_from_statement" or node.type == "import_statement":
        for child in node.children:
            if child.type == "dotted_name":
                first = child.children[0] if child.children else None
                if first is not None and first.type == "identifier":
                    defined.add(first.text.decode("utf-8"))
    elif node.type == "identifier":
        # Регистрируем как использование (сами же поиграем порядком позже)
        used.append((node.text.decode("utf-8"), node.start_point[0] + 1, node.start_point[1] + 1))

    for child in node.children:
        _collect_python_identifiers(child, defined, used)


_PYTHON_BUILTINS = frozenset(
    {
        "print",
        "len",
        "range",
        "int",
        "str",
        "float",
        "list",
        "dict",
        "set",
        "tuple",
        "bool",
        "True",
        "False",
        "None",
        "input",
        "open",
        "type",
        "isinstance",
        "abs",
        "min",
        "max",
        "sum",
        "sorted",
        "map",
        "filter",
        "enumerate",
        "zip",
        "Exception",
        "ValueError",
        "TypeError",
        "KeyError",
        "IndexError",
        "self",
    }
)


def detect_undefined_variables(code: str) -> list[DetectedError]:
    """Только для Python в MVP. Для JS — следующая итерация."""
    tree = parse(code, "python")
    defined: set[str] = set()
    used: list[tuple[str, int, int]] = []
    _collect_python_identifiers(tree.root_node, defined, used)

    errors: list[DetectedError] = []
    seen: set[tuple[str, int, int]] = set()
    for name, line, col in used:
        if name in _PYTHON_BUILTINS or name in defined:
            continue
        key = (name, line, col)
        if key in seen:
            continue
        seen.add(key)
        errors.append(
            DetectedError(
                error_type="semantic/undefined_variable",
                location=CodeLocation(line=line, column=col),
                symbol=name,
            )
        )
    return errors


def detect_all(code: str, language: str) -> list[DetectedError]:
    """Главная функция — комбинирует все детекторы. Дедуплицирует по локации."""
    found = detect_syntax_errors(code, language)

    # Семантику запускаем только если синтаксис ОК (иначе AST поломан)
    if not found and language == "python":
        found.extend(detect_undefined_variables(code))

    return found
