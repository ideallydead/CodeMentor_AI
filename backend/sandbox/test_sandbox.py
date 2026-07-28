import pytest
import shutil
from backend.sandbox.sandbox_runner import execute_in_sandbox


def test_python_sandbox_success():
    code = "print('Hello from Python Sandbox')"
    result = execute_in_sandbox(code, 'python')
    assert result['status'] == 'success'
    assert 'Hello from Python Sandbox' in result['stdout']
    assert result['exit_code'] == 0
    assert result['execution_time_ms'] > 0


def test_python_sandbox_runtime_error():
    code = "x = 1 / 0"
    result = execute_in_sandbox(code, 'python')
    assert result['status'] == 'runtime_error'
    assert result['exit_code'] != 0
    assert 'ZeroDivisionError' in result['stderr']


def test_python_sandbox_timeout():
    code = "import time\nwhile True: time.sleep(0.1)"
    result = execute_in_sandbox(code, 'python', timeout_seconds=1)
    assert result['status'] == 'timeout'
    assert 'timed out' in result['stderr']


def test_c_sandbox():
    gcc_path = shutil.which('gcc') or shutil.which('clang')
    if not gcc_path:
        pytest.skip("No C compiler (gcc/clang) found on host")
    
    code = """
#include <stdio.h>
int main() {
    printf("Hello from C Sandbox\\n");
    return 0;
}
"""
    result = execute_in_sandbox(code, 'c')
    assert result['status'] == 'success'
    assert 'Hello from C Sandbox' in result['stdout']
    assert result['exit_code'] == 0


def test_java_sandbox():
    javac_path = shutil.which('javac')
    if not javac_path:
        pytest.skip("No Java compiler (javac) found on host")

    code = """
public class SandboxTest {
    public static void main(String[] args) {
        System.out.println("Hello from Java Sandbox");
    }
}
"""
    result = execute_in_sandbox(code, 'java')
    assert result['status'] == 'success'
    assert 'Hello from Java Sandbox' in result['stdout']
    assert result['exit_code'] == 0
