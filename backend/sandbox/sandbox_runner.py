import os
import re
import time
import shutil
import tempfile
import subprocess
from typing import Dict, Any, Optional

MAX_OUTPUT_BYTES = 64000


def _truncate_output(text: str, max_bytes: int = MAX_OUTPUT_BYTES) -> str:
    if not text:
        return ""
    if len(text.encode('utf-8')) > max_bytes:
        return text[:max_bytes] + "\n...[Output Truncated]"
    return text


def _extract_java_class_name(source: str) -> str:
    match = re.search(r'public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)', source)
    if match:
        return match.group(1)
    return "Main"


def execute_in_sandbox(
    source: str,
    language: str,
    metadata: Optional[Dict[str, Any]] = None,
    timeout_seconds: int = 5,
    stdin_input: str = ""
) -> Dict[str, Any]:
    """
    Execute source code in an isolated sandbox environment.
    Supports Python, Java, and C.
    
    Returns a dict containing:
        - status: 'success' | 'compile_error' | 'runtime_error' | 'timeout' | 'error'
        - stdout: str
        - stderr: str
        - exit_code: int
        - execution_time_ms: float
        - language: str
    """
    lang = language.lower()
    start_time = time.time()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            if lang == 'python':
                file_path = os.path.join(tmpdir, 'script.py')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(source)
                
                cmd = [shutil.which('python') or shutil.which('python3') or 'python', file_path]
                proc = subprocess.run(
                    cmd,
                    input=stdin_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    cwd=tmpdir
                )
                exec_time = round((time.time() - start_time) * 1000, 2)
                
                status = 'success' if proc.returncode == 0 else 'runtime_error'
                return {
                    'status': status,
                    'stdout': _truncate_output(proc.stdout),
                    'stderr': _truncate_output(proc.stderr),
                    'exit_code': proc.returncode,
                    'execution_time_ms': exec_time,
                    'language': language
                }

            elif lang == 'c':
                c_file = os.path.join(tmpdir, 'main.c')
                bin_name = 'main_bin.exe' if os.name == 'nt' else 'main_bin'
                bin_path = os.path.join(tmpdir, bin_name)
                
                with open(c_file, 'w', encoding='utf-8') as f:
                    f.write(source)
                
                gcc_path = shutil.which('gcc') or shutil.which('clang')
                if not gcc_path:
                    return {
                        'status': 'error',
                        'stdout': '',
                        'stderr': 'C compiler (gcc/clang) not found on host system.',
                        'exit_code': -1,
                        'execution_time_ms': 0,
                        'language': language
                    }
                
                compile_proc = subprocess.run(
                    [gcc_path, '-O2', c_file, '-o', bin_path],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=tmpdir
                )
                
                if compile_proc.returncode != 0:
                    return {
                        'status': 'compile_error',
                        'stdout': _truncate_output(compile_proc.stdout),
                        'stderr': _truncate_output(compile_proc.stderr),
                        'exit_code': compile_proc.returncode,
                        'execution_time_ms': round((time.time() - start_time) * 1000, 2),
                        'language': language
                    }
                
                proc = subprocess.run(
                    [bin_path],
                    input=stdin_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    cwd=tmpdir
                )
                exec_time = round((time.time() - start_time) * 1000, 2)
                status = 'success' if proc.returncode == 0 else 'runtime_error'
                
                return {
                    'status': status,
                    'stdout': _truncate_output(proc.stdout),
                    'stderr': _truncate_output(proc.stderr),
                    'exit_code': proc.returncode,
                    'execution_time_ms': exec_time,
                    'language': language
                }

            elif lang == 'java':
                class_name = _extract_java_class_name(source)
                java_file = os.path.join(tmpdir, f'{class_name}.java')
                
                with open(java_file, 'w', encoding='utf-8') as f:
                    f.write(source)
                
                javac_path = shutil.which('javac')
                java_path = shutil.which('java')
                if not javac_path or not java_path:
                    return {
                        'status': 'error',
                        'stdout': '',
                        'stderr': 'Java compiler/runtime (javac/java) not found on host system.',
                        'exit_code': -1,
                        'execution_time_ms': 0,
                        'language': language
                    }
                
                compile_proc = subprocess.run(
                    [javac_path, java_file],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=tmpdir
                )
                
                if compile_proc.returncode != 0:
                    return {
                        'status': 'compile_error',
                        'stdout': _truncate_output(compile_proc.stdout),
                        'stderr': _truncate_output(compile_proc.stderr),
                        'exit_code': compile_proc.returncode,
                        'execution_time_ms': round((time.time() - start_time) * 1000, 2),
                        'language': language
                    }
                
                proc = subprocess.run(
                    [java_path, '-cp', tmpdir, class_name],
                    input=stdin_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    cwd=tmpdir
                )
                exec_time = round((time.time() - start_time) * 1000, 2)
                status = 'success' if proc.returncode == 0 else 'runtime_error'
                
                return {
                    'status': status,
                    'stdout': _truncate_output(proc.stdout),
                    'stderr': _truncate_output(proc.stderr),
                    'exit_code': proc.returncode,
                    'execution_time_ms': exec_time,
                    'language': language
                }

            else:
                return {
                    'status': 'error',
                    'stdout': '',
                    'stderr': f'Unsupported language: {language}',
                    'exit_code': -1,
                    'execution_time_ms': 0,
                    'language': language
                }

        except subprocess.TimeoutExpired:
            exec_time = round((time.time() - start_time) * 1000, 2)
            return {
                'status': 'timeout',
                'stdout': '',
                'stderr': f'Execution timed out after {timeout_seconds} seconds.',
                'exit_code': -1,
                'execution_time_ms': exec_time,
                'language': language
            }
        except Exception as exc:
            exec_time = round((time.time() - start_time) * 1000, 2)
            return {
                'status': 'error',
                'stdout': '',
                'stderr': f'Sandbox execution error: {str(exc)}',
                'exit_code': -1,
                'execution_time_ms': exec_time,
                'language': language
            }

