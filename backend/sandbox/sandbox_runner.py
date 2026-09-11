import os
import re
import time
import shutil
import tempfile
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
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


def _is_docker_available() -> bool:
    """Check if Docker CLI is installed and USE_DOCKER_SANDBOX is explicitly enabled."""
    if os.environ.get("USE_DOCKER_SANDBOX", "0").lower() not in ("1", "true", "yes"):
        return False
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    try:
        proc = subprocess.run([docker_bin, "info"], capture_output=True, timeout=3)
        return proc.returncode == 0
    except Exception:
        return False


def _prepare_python_script(source: str, stdin_input: str) -> str:
    """
    If student source code defines functions or calls input(),
    wrap standard input to handle EOFError gracefully when blank input is provided.
    """
    safe_input_prefix = """import sys
try:
    _orig_input = input
    def input(prompt=''):
        try:
            return _orig_input(prompt)
        except (EOFError, RuntimeError):
            return ''
except Exception:
    pass
"""
    # Prepend safe input handler if source uses input()
    if "input(" in source or "sys.stdin" in source:
        source = safe_input_prefix + "\n" + source

    if "def " in source and "__name__" not in source and "print(" not in source:
        harness = f"""
import sys, re, ast, json

_raw_in = {repr(stdin_input)}.strip()

def _run_student():
    funcs = [v for k, v in list(globals().items()) if callable(v) and not k.startswith('_') and k not in ('sys', 're', 'ast', 'json', 'input', '_orig_input')]
    if not funcs:
        return
    fn = funcs[-1]
    if _raw_in:
        try:
            # 1. Check if named kwargs assignment e.g. 'nums = [2, 7], target = 9'
            if '=' in _raw_in:
                matches = re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*?)(?:,\\s*(?=[A-Za-z_][A-Za-z0-9_]*\\s*=)|$)', _raw_in)
                if matches:
                    kwargs = {{k: ast.literal_eval(v) for k, v in matches}}
                    res = fn(**kwargs)
                    print(json.dumps(res) if isinstance(res, (list, dict, tuple)) else res)
                    return
            
            # 2. Try ast literal eval for pure python literals e.g. '[1, 2, 3]'
            try:
                val = ast.literal_eval(_raw_in)
                res = fn(val) if not isinstance(val, tuple) else fn(*val)
                print(json.dumps(res) if isinstance(res, (list, dict, tuple)) else res)
                return
            except Exception:
                pass

            # 3. HackerRank line-by-line stdin format (e.g. line 1: '1 2 3 4 5', line 2: '3')
            lines = [l.strip() for l in _raw_in.splitlines() if l.strip()]
            if lines:
                args = []
                for line in lines:
                    tokens = line.split()
                    if len(tokens) > 1:
                        parsed_row = []
                        for tok in tokens:
                            try:
                                parsed_row.append(int(tok))
                            except ValueError:
                                try:
                                    parsed_row.append(float(tok))
                                except ValueError:
                                    parsed_row.append(tok)
                        args.append(parsed_row)
                    elif len(tokens) == 1:
                        tok = tokens[0]
                        try:
                            args.append(int(tok))
                        except ValueError:
                            try:
                                args.append(float(tok))
                            except ValueError:
                                try:
                                    args.append(ast.literal_eval(tok))
                                except Exception:
                                    args.append(tok)
                if args:
                    import inspect
                    call_args = args
                    try:
                        sig = inspect.signature(fn)
                        num_params = len(sig.parameters)
                        if len(args) > num_params and len(args) >= 2 and isinstance(args[0], int) and isinstance(args[1], list) and len(args[1]) == args[0]:
                            call_args = args[1:]
                    except Exception:
                        pass
                    try:
                        res = fn(*call_args)
                        print(json.dumps(res) if isinstance(res, (list, dict, tuple)) else res)
                        return
                    except TypeError:
                        res = fn(*args)
                        print(json.dumps(res) if isinstance(res, (list, dict, tuple)) else res)
                        return
        except Exception:
            pass
    try:
        res = fn()
        if res is not None:
            print(json.dumps(res) if isinstance(res, (list, dict, tuple)) else res)
    except Exception:
        pass

_run_student()
"""
        return source + "\n" + harness
    return source


def _execute_in_docker_container(
    source: str,
    language: str,
    timeout_seconds: int,
    stdin_input: str
) -> Optional[Dict[str, Any]]:
    """
    Execute source code inside an ephemeral, network-isolated Docker container.
    Returns None if docker invocation fails unexpectedly so caller can fallback.
    """
    lang = language.lower()
    start_time = time.time()
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return None

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            container_img = "python:3.10-slim"
            if lang == 'python':
                file_name = 'script.py'
                run_cmd = f"python /sandbox/{file_name}"
                prepared_source = _prepare_python_script(source, stdin_input)
            elif lang == 'c':
                file_name = 'main.c'
                container_img = "gcc:latest"
                run_cmd = "gcc -O2 /sandbox/main.c -o /sandbox/main_bin && /sandbox/main_bin"
                prepared_source = source
            elif lang == 'java':
                class_name = _extract_java_class_name(source)
                file_name = f"{class_name}.java"
                container_img = "openjdk:17-slim"
                run_cmd = f"javac /sandbox/{file_name} && java -cp /sandbox {class_name}"
                prepared_source = source
            else:
                return None

            file_path = os.path.join(tmpdir, file_name)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(prepared_source)

            # docker run --rm -i --net=none --memory=256m --cpus=0.5 --pids-limit=64 -v tmpdir:/sandbox image sh -c "cmd"
            docker_cmd = [
                docker_bin, "run", "--rm", "-i",
                "--net=none",
                "--memory=256m",
                "--cpus=0.5",
                "--pids-limit=64",
                "-v", f"{tmpdir}:/sandbox",
                container_img,
                "sh", "-c", run_cmd
            ]

            proc = subprocess.run(
                docker_cmd,
                input=stdin_input,
                capture_output=True,
                text=True,
                timeout=timeout_seconds + 5
            )
            exec_time = round((time.time() - start_time) * 1000, 2)

            status = 'success' if proc.returncode == 0 else 'runtime_error'
            if 'error' in proc.stderr.lower() and 'javac' in proc.stderr.lower():
                status = 'compile_error'

            return {
                'status': status,
                'stdout': _truncate_output(proc.stdout),
                'stderr': _truncate_output(proc.stderr),
                'exit_code': proc.returncode,
                'execution_time_ms': exec_time,
                'language': language,
                'sandbox_mode': 'docker'
            }
        except subprocess.TimeoutExpired:
            return {
                'status': 'timeout',
                'stdout': '',
                'stderr': f'Execution timed out after {timeout_seconds} seconds.',
                'exit_code': -1,
                'execution_time_ms': round((time.time() - start_time) * 1000, 2),
                'language': language,
                'sandbox_mode': 'docker'
            }
        except Exception as exc:
            logger.warning(f"Docker execution encountered error, falling back to host process: {exc}")
            return None


def _execute_in_host_process(
    source: str,
    language: str,
    timeout_seconds: int,
    stdin_input: str
) -> Dict[str, Any]:
    """Execute source code in local host process with temporary directory and timeout."""
    lang = language.lower()
    start_time = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            if lang == 'python':
                file_path = os.path.join(tmpdir, 'script.py')
                prepared_source = _prepare_python_script(source, stdin_input)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(prepared_source)

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
                    'language': language,
                    'sandbox_mode': 'host_process'
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
                        'language': language,
                        'sandbox_mode': 'host_process'
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
                        'language': language,
                        'sandbox_mode': 'host_process'
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
                    'language': language,
                    'sandbox_mode': 'host_process'
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
                        'language': language,
                        'sandbox_mode': 'host_process'
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
                        'language': language,
                        'sandbox_mode': 'host_process'
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
                    'language': language,
                    'sandbox_mode': 'host_process'
                }

            else:
                return {
                    'status': 'error',
                    'stdout': '',
                    'stderr': f'Unsupported language: {language}',
                    'exit_code': -1,
                    'execution_time_ms': 0,
                    'language': language,
                    'sandbox_mode': 'host_process'
                }

        except subprocess.TimeoutExpired:
            exec_time = round((time.time() - start_time) * 1000, 2)
            return {
                'status': 'timeout',
                'stdout': '',
                'stderr': f'Execution timed out after {timeout_seconds} seconds.',
                'exit_code': -1,
                'execution_time_ms': exec_time,
                'language': language,
                'sandbox_mode': 'host_process'
            }
        except Exception as exc:
            exec_time = round((time.time() - start_time) * 1000, 2)
            return {
                'status': 'error',
                'stdout': '',
                'stderr': f'Sandbox execution error: {str(exc)}',
                'exit_code': -1,
                'execution_time_ms': exec_time,
                'language': language,
                'sandbox_mode': 'host_process'
            }


def execute_in_sandbox(
    source: str,
    language: str,
    metadata: Optional[Dict[str, Any]] = None,
    timeout_seconds: int = 5,
    stdin_input: str = "",
    force_host: bool = False
) -> Dict[str, Any]:
    """
    Execute source code in an isolated sandbox environment.
    Tries Docker container sandbox first if available, otherwise falls back to host process execution.
    """
    if not force_host and _is_docker_available():
        res = _execute_in_docker_container(source, language, timeout_seconds, stdin_input)
        if res is not None:
            return res

    return _execute_in_host_process(source, language, timeout_seconds, stdin_input)
