import pytest
from backend.adapters import python_adapter, java_adapter, c_adapter


def test_python_adapter_valid_code():
    code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
"""
    result = python_adapter.parse_source(code)
    assert result.language == 'python'
    assert result.ast_summary.function_count == 1
    assert result.ast_summary.node_count > 0
    assert result.complexity.cyclomatic_complexity is not None
    assert result.complexity.cyclomatic_complexity >= 2
    assert result.complexity.maintainability_index is not None
    assert len(result.diagnostics) == 0


def test_python_adapter_syntax_error():
    code = "def broken_func(: pass"
    result = python_adapter.parse_source(code)
    assert len(result.diagnostics) > 0
    assert result.diagnostics[0].code == 'SyntaxError'


def test_java_adapter_valid_code():
    code = """
public class Calculator {
    public int add(int a, int b) {
        if (a > 0 && b > 0) {
            return a + b;
        }
        return 0;
    }
}
"""
    result = java_adapter.parse_source(code)
    assert result.language == 'java'
    assert result.ast_summary.class_count == 1
    assert result.ast_summary.function_count == 1
    assert result.complexity.cyclomatic_complexity is not None
    assert result.complexity.cyclomatic_complexity >= 2
    assert result.complexity.rank in ['A', 'B', 'C', 'D', 'F']
    assert len(result.diagnostics) == 0


def test_java_adapter_syntax_error():
    code = "public class Broken { int x = ; }"
    result = java_adapter.parse_source(code)
    assert len(result.diagnostics) > 0
    assert result.diagnostics[0].code == 'JavaSyntaxError'


def test_c_adapter_valid_code():
    code = """
#include <stdio.h>

int main() {
    int x = 10;
    if (x > 5) {
        printf("Greater\\n");
    }
    return 0;
}
"""
    result = c_adapter.parse_source(code)
    assert result.language == 'c'
    assert result.ast_summary.function_count == 1
    assert result.complexity.cyclomatic_complexity is not None
    assert result.complexity.cyclomatic_complexity >= 2
    assert len(result.diagnostics) == 0


def test_c_adapter_syntax_error():
    code = "int main() { if (x > 5 "
    result = c_adapter.parse_source(code)
    assert len(result.diagnostics) > 0
    assert result.diagnostics[0].code == 'CParseError'
