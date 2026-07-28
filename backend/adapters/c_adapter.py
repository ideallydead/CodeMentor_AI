import re
import math
import shutil
import tempfile
import subprocess
from typing import List
from pycparser import c_parser, c_ast
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic


class CASTVisitor(c_ast.NodeVisitor):
    def __init__(self):
        self.node_count = 0
        self.function_count = 0
        self.decisions = 0
        self.includes = []

    def visit(self, node):
        if node is not None:
            self.node_count += 1
            if isinstance(node, c_ast.FuncDef):
                self.function_count += 1
            elif isinstance(node, (c_ast.If, c_ast.For, c_ast.While, c_ast.DoWhile, c_ast.Switch, c_ast.Case)):
                self.decisions += 1
            self.generic_visit(node)


def _preprocess_c_code(source: str) -> str:
    """
    Remove #include/preprocessor directives and comments so pycparser can parse basic C source.
    """
    stubs = [
        "typedef unsigned long size_t;",
        "int printf(const char *format, ...);",
        "int scanf(const char *format, ...);",
        "int puts(const char *str);",
        "void* malloc(size_t size);",
        "void free(void* ptr);",
        "void* calloc(size_t num, size_t size);",
        "int strlen(const char *str);",
        "char* strcpy(char *dest, const char *src);",
    ]
    
    # Strip block comments /* ... */
    text = re.sub(r'/\*.*?\*/', '', source, flags=re.DOTALL)
    # Strip line comments // ...
    text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)

    lines = list(stubs)
    for line in text.splitlines():
        trimmed = line.strip()
        if trimmed.startswith('#include') or trimmed.startswith('#pragma') or trimmed.startswith('#define'):
            lines.append('')
        else:
            lines.append(line)
    return '\n'.join(lines)




def _run_cppcheck(source: str) -> List[Diagnostic]:
    diagnostics: List[Diagnostic] = []
    cppcheck_path = shutil.which('cppcheck')
    if not cppcheck_path:
        return diagnostics

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as tmp:
            tmp.write(source)
            tmp_path = tmp.name

        res = subprocess.run(
            [cppcheck_path, '--enable=all', '--quiet', '--template={line}:{column}:{severity}:{message}', tmp_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        output = res.stderr or res.stdout
        for line in output.splitlines():
            parts = line.strip().split(':', 3)
            if len(parts) == 4:
                line_no = int(parts[0]) if parts[0].isdigit() else 0
                col_no = int(parts[1]) if parts[1].isdigit() else None
                severity = parts[2]
                msg = parts[3]
                diagnostics.append(Diagnostic(
                    path='<submission>',
                    line=line_no,
                    column=col_no,
                    message=msg,
                    severity='warning' if severity in ('warning', 'style', 'performance') else 'error',
                    code=f'cppcheck-{severity}',
                ))
    except Exception:
        pass

    return diagnostics


def parse_source(source: str) -> ParsedSubmission:
    diagnostics: List[Diagnostic] = []
    ast_summary = ASTSummary(
        language='c',
        node_count=0,
        function_count=0,
        class_count=0,
        imports=[],
        summary='C AST parsed summary',
    )
    
    clean_source = _preprocess_c_code(source)
    parser = c_parser.CParser()
    
    cyclomatic_cc = None
    maintainability_idx = None
    rank = None
    loc = len(source.splitlines())

    try:
        tree = parser.parse(clean_source, filename='<submission>')
        visitor = CASTVisitor()
        visitor.visit(tree)
        
        ast_summary.node_count = visitor.node_count
        ast_summary.function_count = visitor.function_count
        
        cyclomatic_cc = max(1, visitor.decisions + 1)
        raw_mi = 100.0 - (cyclomatic_cc * 3.5) - (math.log(max(loc, 1)) * 6.0)
        maintainability_idx = round(max(0.0, min(100.0, raw_mi)), 2)

        if maintainability_idx >= 80:
            rank = 'A'
        elif maintainability_idx >= 65:
            rank = 'B'
        elif maintainability_idx >= 50:
            rank = 'C'
        elif maintainability_idx >= 35:
            rank = 'D'
        else:
            rank = 'F'

    except Exception as exc:
        match = re.search(r':(\d+):(\d+):', str(exc))
        line_no = int(match.group(1)) if match else 0
        col_no = int(match.group(2)) if match else None
        diagnostics.append(Diagnostic(
            path='<submission>',
            line=line_no,
            column=col_no,
            message=str(exc),
            severity='error',
            code='CParseError',
        ))

    # Static analysis findings from cppcheck
    static_findings = _run_cppcheck(source)

    complexity = ComplexityMetrics(
        cyclomatic_complexity=cyclomatic_cc,
        maintainability_index=maintainability_idx,
        loc=loc,
        halstead_volume=None,
        rank=rank,
    )

    return ParsedSubmission(
        submission_id='c-parse-1',
        language='c',
        source=source,
        ast_summary=ast_summary,
        complexity=complexity,
        diagnostics=diagnostics,
        static_findings=static_findings,
        metadata={}
    )

