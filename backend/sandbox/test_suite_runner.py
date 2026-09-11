from typing import List, Dict, Any, Union
from backend.core.schemas import SandboxResults, SandboxTestResult
from backend.sandbox.sandbox_runner import execute_in_sandbox


import re

def _normalize_text(text: str) -> str:
    """Normalize output text by stripping trailing whitespace and normalizing newlines."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.strip().splitlines()]
    return "\n".join(lines)


def _outputs_match(actual: str, expected: str) -> bool:
    """Compare student stdout against expected output, allowing whitespace/bracket flexibility."""
    norm_actual = _normalize_text(actual)
    norm_expected = _normalize_text(expected)
    if norm_actual == norm_expected:
        return True
    # Case-insensitive boolean comparison
    if norm_actual.lower() == norm_expected.lower():
        return True
    # Strip brackets, parentheses, commas and compare token by token
    def _tokenize(s: str):
        cleaned = re.sub(r'[\[\]\(\),]', ' ', s)
        return cleaned.split()
    tok_actual = _tokenize(norm_actual)
    tok_expected = _tokenize(norm_expected)
    if tok_actual and tok_actual == tok_expected:
        return True
    return False


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
        test_id = f"tc_{idx+1}"
        if hasattr(tc, 'id'):
            inp = tc.input_data or ""
            expected = tc.expected_output or ""
        else:
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
                error_message=f"Compilation Error: {exec_res['stderr']}",
                input_data=inp,
                expected_output=expected,
                failure_reason=f"Compilation Error: {exec_res['stderr'].strip()}"
            ))
            break # Stop further test execution on compilation error

        elif exec_res['status'] == 'timeout':
            timeout_error = exec_res['stderr']
            test_results.append(SandboxTestResult(
                test_id=test_id,
                passed=False,
                actual_output="",
                execution_time_ms=exec_res['execution_time_ms'],
                error_message=f"Timeout: {exec_res['stderr']}",
                input_data=inp,
                expected_output=expected,
                failure_reason="Execution Timeout: Process exceeded maximum time limit (possible infinite loop or blocking I/O)."
            ))

        else:
            actual = exec_res.get('stdout', '')
            passed = _outputs_match(actual, expected) and (exec_res['status'] == 'success')
            
            if passed:
                err_msg = None
                failure_reason = None
            elif exec_res.get('status') == 'runtime_error' or exec_res.get('stderr'):
                stderr_clean = (exec_res.get('stderr') or '').strip()
                err_msg = stderr_clean
                failure_reason = f"Runtime Error during execution: {stderr_clean}"
            elif not actual.strip():
                err_msg = f"No output produced. Expected '{expected}'."
                failure_reason = f"No output produced: Program terminated without printing expected output '{expected}'."
            else:
                err_msg = f"Output mismatch. Expected '{expected}', got '{actual}'"
                failure_reason = f"Output mismatch: Expected '{expected}', but received '{actual}'."

            test_results.append(SandboxTestResult(
                test_id=test_id,
                passed=passed,
                actual_output=actual,
                execution_time_ms=exec_res['execution_time_ms'],
                error_message=err_msg,
                input_data=inp,
                expected_output=expected,
                failure_reason=failure_reason
            ))

    return SandboxResults(
        submission_id=submission_id,
        language=language,
        test_results=test_results,
        compilation_error=compilation_error,
        timeout_error=timeout_error
    )
