from typing import List, Dict, Any, Union
from backend.core.schemas import SandboxResults, SandboxTestResult
from backend.sandbox.sandbox_runner import execute_in_sandbox


def _normalize_text(text: str) -> str:
    """Normalize output text by stripping trailing whitespace and normalizing newlines."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.strip().splitlines()]
    return "\n".join(lines)


def run_test_suite_against_code(
    submission_id: str,
    source: str,
    language: str,
    test_cases: List[Union[Dict[str, Any], Any]]
) -> SandboxResults:
    """
    Run student submission code against a suite of test cases inside the sandbox.
    
    Args:
        submission_id: Unique submission ID string
        source: Student source code
        language: Programming language ('python', 'c', 'java')
        test_cases: List of TestCase dicts or SQLAlchemy TestCase models
    
    Returns:
        SandboxResults containing aggregated test pass/fail metrics
    """
    test_results: List[SandboxTestResult] = []
    compilation_error = None
    timeout_error = None

    for idx, tc in enumerate(test_cases):
        if hasattr(tc, 'id'):
            test_id = f"tc_{tc.id}"
            inp = tc.input_data or ""
            expected = tc.expected_output or ""
        else:
            test_id = str(tc.get('id', f"tc_{idx+1}"))
            inp = tc.get('input_data') if tc.get('input_data') is not None else tc.get('input', '')
            expected = tc.get('expected_output', '')

        exec_res = execute_in_sandbox(source, language, stdin_input=inp)

        if exec_res['status'] == 'compile_error':
            compilation_error = exec_res['stderr']
            test_results.append(SandboxTestResult(
                test_id=test_id,
                passed=False,
                actual_output="",
                execution_time_ms=exec_res['execution_time_ms'],
                error_message=f"Compilation Error: {exec_res['stderr']}"
            ))
            break # Stop further test execution on compilation error

        elif exec_res['status'] == 'timeout':
            timeout_error = exec_res['stderr']
            test_results.append(SandboxTestResult(
                test_id=test_id,
                passed=False,
                actual_output="",
                execution_time_ms=exec_res['execution_time_ms'],
                error_message=f"Timeout: {exec_res['stderr']}"
            ))

        else:
            actual = exec_res.get('stdout', '')
            passed = (_normalize_text(actual) == _normalize_text(expected)) and (exec_res['status'] == 'success')
            err_msg = None if passed else (exec_res.get('stderr') or f"Output mismatch. Expected '{expected}', got '{actual}'")

            test_results.append(SandboxTestResult(
                test_id=test_id,
                passed=passed,
                actual_output=actual,
                execution_time_ms=exec_res['execution_time_ms'],
                error_message=err_msg
            ))

    return SandboxResults(
        submission_id=submission_id,
        language=language,
        test_results=test_results,
        compilation_error=compilation_error,
        timeout_error=timeout_error
    )
