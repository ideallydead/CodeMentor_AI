import ast
from typing import List
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic

try:
    from radon.complexity import cc_visit, cc_rank
    from radon.metrics import mi_visit, h_visit
    RADON_AVAILABLE = True
except ImportError:
    RADON_AVAILABLE = False


def _detect_python_code_smells(tree: ast.AST, source: str) -> List[Diagnostic]:
    findings: List[Diagnostic] = []
    lines = source.splitlines()

    for node in ast.walk(tree):
        # 1. Mutable default arguments
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for default in node.args.defaults:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    findings.append(Diagnostic(
                        path='<submission>',
                        line=node.lineno,
                        column=node.col_offset,
                        message=f"Function '{node.name}' uses a mutable default argument ({type(default).__name__.lower()}); can cause shared state bugs across calls",
                        severity='warning',
                        code='mutable-default-arg'
                    ))
            # Function length check
            fn_lines = (node.end_lineno or node.lineno) - node.lineno + 1
            if fn_lines > 50:
                findings.append(Diagnostic(
                    path='<submission>',
                    line=node.lineno,
                    column=node.col_offset,
                    message=f"Function '{node.name}' is {fn_lines} lines long (exceeds recommended 50 lines); consider decomposing into helper functions",
                    severity='info',
                    code='long-function'
                ))

        # 2. Bare or broad exception handling
        elif isinstance(node, ast.ExceptHandler):
            if node.type is None:
                findings.append(Diagnostic(
                    path='<submission>',
                    line=node.lineno,
                    column=node.col_offset,
                    message="Bare 'except:' catch clause detected; catches SystemExit and KeyboardInterrupt. Use 'except Exception:' or specific error types",
                    severity='warning',
                    code='bare-except'
                ))
            elif isinstance(node.type, ast.Name) and node.type.id == 'Exception' and len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                findings.append(Diagnostic(
                    path='<submission>',
                    line=node.lineno,
                    column=node.col_offset,
                    message="Silent exception swallowing ('except Exception: pass') hides unexpected runtime errors and makes debugging difficult",
                    severity='warning',
                    code='silent-exception'
                ))

    # 3. Deep nesting check
    def check_nesting(node, current_depth=0):
        nested_constructs = (ast.For, ast.AsyncFor, ast.While, ast.If, ast.Try, ast.With, ast.AsyncWith)
        new_depth = current_depth + (1 if isinstance(node, nested_constructs) else 0)
        if new_depth > 4 and isinstance(node, nested_constructs):
            findings.append(Diagnostic(
                path='<submission>',
                line=getattr(node, 'lineno', 0),
                column=getattr(node, 'col_offset', 0),
                message=f"Excessive nesting depth ({new_depth} levels); refactor with early return guard clauses or helper functions",
                severity='warning',
                code='deep-nesting'
            ))
        for child in ast.iter_child_nodes(node):
            check_nesting(child, new_depth)

    check_nesting(tree)

    # 4. Semicolon used for multiple statements on single line
    for idx, line in enumerate(lines, start=1):
        clean_l = line.split('#')[0].strip()
        if ';' in clean_l and not clean_l.endswith(';'):
            findings.append(Diagnostic(
                path='<submission>',
                line=idx,
                column=line.find(';'),
                message="Multiple statements chained with ';' on a single line violates Python style guidelines (PEP 8)",
                severity='info',
                code='multiple-statements-line'
            ))

    return findings


def parse_source(source: str) -> ParsedSubmission:
    diagnostics: List[Diagnostic] = []
    static_findings: List[Diagnostic] = []
    metadata = {}
    ast_summary = ASTSummary(
        language='python',
        node_count=0,
        function_count=0,
        class_count=0,
        imports=[],
        summary='Python AST parsed summary',
        metadata=metadata
    )
    
    parsed_ok = False
    tree = None
    try:
        tree = ast.parse(source)
        parsed_ok = True
        all_nodes = list(ast.walk(tree))
        ast_summary.node_count = len(all_nodes)
        ast_summary.function_count = sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in all_nodes)
        ast_summary.class_count = sum(isinstance(node, ast.ClassDef) for node in all_nodes)
        
        imports = []
        for node in all_nodes:
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
        ast_summary.imports = list(set(imports))

        # Detect idioms & constructs for Socratic and Viva agents
        has_recursion = False
        for fn in all_nodes:
            if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_name = fn.name
                for child in ast.walk(fn):
                    if isinstance(child, ast.Call) and isinstance(child.func, ast.Name) and child.func.id == fn_name:
                        has_recursion = True
                        break

        has_list_comp = any(isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp)) for node in all_nodes)
        has_generator = any(isinstance(node, (ast.GeneratorExp, ast.Yield, ast.YieldFrom)) for node in all_nodes)

        metadata['has_recursion'] = has_recursion
        metadata['has_list_comp'] = has_list_comp
        metadata['has_generator'] = has_generator
        ast_summary.metadata = metadata

        # Detect static code smells
        static_findings = _detect_python_code_smells(tree, source)
        diagnostics.extend(static_findings)

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
    halstead_diff = None
    halstead_eff = None
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
            target = getattr(h_metrics, 'total', h_metrics)
            if hasattr(target, 'volume'):
                halstead_vol = round(getattr(target, 'volume', 0.0), 2)
            if hasattr(target, 'difficulty'):
                halstead_diff = round(getattr(target, 'difficulty', 0.0), 2)
            if hasattr(target, 'effort'):
                halstead_eff = round(getattr(target, 'effort', 0.0), 2)
        except Exception:
            pass

    complexity = ComplexityMetrics(
        cyclomatic_complexity=cyclomatic_cc,
        maintainability_index=maintainability_idx,
        loc=len(source.splitlines()),
        halstead_volume=halstead_vol,
        difficulty=halstead_diff,
        effort=halstead_eff,
        rank=rank,
    )

    return ParsedSubmission(
        submission_id='python-parse-1',
        language='python',
        source=source,
        ast_summary=ast_summary,
        complexity=complexity,
        diagnostics=diagnostics,
        static_findings=static_findings,
        metadata=metadata
    )

