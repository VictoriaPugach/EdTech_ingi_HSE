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
