import ast
from typing import List
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic

try:
    from radon.complexity import cc_visit, cc_rank
    from radon.metrics import mi_visit, h_visit
    RADON_AVAILABLE = True
except ImportError:
    RADON_AVAILABLE = False


def parse_source(source: str) -> ParsedSubmission:
    diagnostics: List[Diagnostic] = []
    ast_summary = ASTSummary(
        language='python',
        node_count=0,
        function_count=0,
        class_count=0,
        imports=[],
        summary='Python AST parsed summary',
    )
    
    parsed_ok = False
    try:
        tree = ast.parse(source)
        parsed_ok = True
        ast_summary.node_count = len(list(ast.walk(tree)))
        ast_summary.function_count = sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in ast.walk(tree))
        ast_summary.class_count = sum(isinstance(node, ast.ClassDef) for node in ast.walk(tree))
        
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
        ast_summary.imports = list(set(imports))
    except SyntaxError as exc:
        diagnostics.append(Diagnostic(
            path='<submission>',
            line=exc.lineno or 0,
            column=exc.offset,
            message=str(exc.msg),
            severity='error',
            code='SyntaxError',
        ))

    cyclomatic_cc = None
    maintainability_idx = None
    halstead_vol = None
    rank = None

    if parsed_ok and RADON_AVAILABLE:
        try:
            cc_blocks = cc_visit(source)
            if cc_blocks:
                total_cc = sum(b.complexity for b in cc_blocks)
                cyclomatic_cc = total_cc
                rank = cc_rank(total_cc / max(len(cc_blocks), 1))
            else:
                cyclomatic_cc = 1
                rank = 'A'

            maintainability_idx = round(mi_visit(source, multi=False), 2)
            h_metrics = h_visit(source)
            if hasattr(h_metrics, 'total') and hasattr(h_metrics.total, 'volume'):
                halstead_vol = round(h_metrics.total.volume, 2)
            elif hasattr(h_metrics, 'volume'):
                halstead_vol = round(h_metrics.volume, 2)
        except Exception:
            pass

    complexity = ComplexityMetrics(
        cyclomatic_complexity=cyclomatic_cc,
        maintainability_index=maintainability_idx,
        loc=len(source.splitlines()),
        halstead_volume=halstead_vol,
        rank=rank,
    )

    return ParsedSubmission(
        submission_id='python-parse-1',
        language='python',
        source=source,
        ast_summary=ast_summary,
        complexity=complexity,
        diagnostics=diagnostics,
        static_findings=[],
        metadata={}
    )

