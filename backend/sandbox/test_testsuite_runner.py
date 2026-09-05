import pytest
from backend.sandbox.test_suite_runner import run_test_suite_against_code, _normalize_text


def test_normalize_text():
    raw = "Hello World \n\n"
    assert _normalize_text(raw) == "Hello World"


def test_run_test_suite_success():
    python_code = """
import sys
input_data = sys.stdin.read().strip()
if input_data == '5':
    print('25')
elif input_data == '3':
    print('9')
"""
    test_cases = [
        {"id": "tc_1", "input_data": "5", "expected_output": "25"},
        {"id": "tc_2", "input_data": "3", "expected_output": "9"}
    ]

    results = run_test_suite_against_code("sub_001", python_code, "python", test_cases)
    assert len(results.test_results) == 2
    assert results.test_results[0].passed is True
    assert results.test_results[1].passed is True
    assert results.compilation_error is None


def test_run_test_suite_partial_failure():
    python_code = """
import sys
input_data = sys.stdin.read().strip()
if input_data == '5':
    print('25')
else:
    print('0') # Bug for inputs other than 5
"""
    test_cases = [
        {"id": "tc_1", "input_data": "5", "expected_output": "25"},
        {"id": "tc_2", "input_data": "3", "expected_output": "9"}
    ]

    results = run_test_suite_against_code("sub_002", python_code, "python", test_cases)
    assert len(results.test_results) == 2
    assert results.test_results[0].passed is True
    assert results.test_results[1].passed is False
    assert "Output mismatch" in results.test_results[1].error_message
