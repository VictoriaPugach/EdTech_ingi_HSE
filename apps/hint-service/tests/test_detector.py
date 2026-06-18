"""Базовые тесты детектора (TC-05, TC-06 из System Design)."""

from src.analyzer.detector import detect_all


def test_unmatched_paren_python():
    """TC-05 из System Design §2.6."""
    code = 'print("Hello"'
    errors = detect_all(code, "python")
    assert len(errors) >= 1
    assert errors[0].error_type == "syntax/unmatched_paren"
    assert errors[0].location.line == 1


def test_undefined_variable_python():
    """TC-06 из System Design §2.6."""
    code = "print(x)"
    errors = detect_all(code, "python")
    assert any(e.error_type == "semantic/undefined_variable" and e.symbol == "x" for e in errors)


def test_clean_code_no_errors():
    code = "x = 5\nprint(x)"
    errors = detect_all(code, "python")
    assert errors == []


def test_missing_colon_python():
    code = "for i in range(3)\n    print(i)"
    errors = detect_all(code, "python")
    assert errors[0].error_type == "syntax/missing_colon"


def test_invalid_indentation_python():
    code = "def f():\nprint(1)"
    errors = detect_all(code, "python")
    assert errors[0].error_type == "syntax/invalid_indentation"


def test_print_without_parens_python():
    """Частая ошибка новичков (стиль Python 2)."""
    code = 'print "hello"'
    errors = detect_all(code, "python")
    assert len(errors) == 1
    assert "скобк" in errors[0].message.lower()


def test_unterminated_string_python():
    code = 's = "hello'
    errors = detect_all(code, "python")
    assert errors[0].error_type == "syntax/unmatched_quote"
