"""Tree-sitter парсеры для Python и JavaScript.

Согласно System Design §1.2 (BC-2 AST Analyzer):
- инкрементальный парсинг (быстро при правках);
- корректная обработка некорректного кода (ERROR-узлы вместо краша) — нужно для TC-05.
"""

from __future__ import annotations

from functools import lru_cache

import tree_sitter_javascript
import tree_sitter_python
from tree_sitter import Language, Parser


@lru_cache(maxsize=8)
def _parser_for(language: str) -> Parser:
    """Кэшируем парсеры на язык — Tree-sitter рекомендует переиспользовать."""
    if language == "python":
        lang = Language(tree_sitter_python.language())
    elif language == "javascript":
        lang = Language(tree_sitter_javascript.language())
    else:
        raise ValueError(f"Unsupported language: {language}")
    p = Parser(lang)
    return p


def parse(code: str, language: str):
    """Возвращает корневой Tree-sitter Node."""
    parser = _parser_for(language)
    tree = parser.parse(code.encode("utf-8"))
    return tree
