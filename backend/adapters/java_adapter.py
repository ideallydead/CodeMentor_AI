import math
import javalang
from typing import List, Tuple
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic


def _parse_java_tree(source: str):
    """
    Attempt to parse Java source code using javalang.
    If full compilation unit fails, try wrapping method snippets inside a dummy class.
    """
    try:
        return javalang.parse.parse(source), source, False
    except (javalang.parser.JavaSyntaxError, TypeError, javalang.tokenizer.LexerError):
        # Snippet fallback: wrap in class
        wrapped = f"public class _CodeWrapper {{\n{source}\n}}"
        try:
            tree = javalang.parse.parse(wrapped)
            return tree, wrapped, True
        except Exception:
            raise


def parse_source(source: str) -> ParsedSubmission:
    diagnostics: List[Diagnostic] = []
    ast_summary = ASTSummary(
        language='java',
        node_count=0,
        function_count=0,
        class_count=0,
        imports=[],
        summary='Java AST parsed summary',
    )

    cyclomatic_cc = 1.0
    maintainability_idx = 85.0
    halstead_volume = None
    rank = 'A'
    loc = len(source.splitlines())

    try:
        tree, effective_source, is_wrapped = _parse_java_tree(source)
        nodes = list(tree.filter(lambda n: True))
        ast_summary.node_count = len(nodes)
        ast_summary.function_count = sum(1 for path, node in tree.filter(javalang.tree.MethodDeclaration))
        ast_summary.class_count = max(0, sum(1 for path, node in tree.filter(javalang.tree.ClassDeclaration)) - (1 if is_wrapped else 0))
        ast_summary.imports = [path.path for path in tree.imports if hasattr(path, 'path')]

        decisions = 0
        for path, node in tree:
            if isinstance(node, (
                javalang.tree.IfStatement,
                javalang.tree.ForStatement,
                javalang.tree.WhileStatement,
                javalang.tree.DoStatement,
                javalang.tree.CatchClause,
                javalang.tree.SwitchStatementCase,
                javalang.tree.TernaryExpression,
            )):
                decisions += 1
            elif isinstance(node, javalang.tree.BinaryOperation) and hasattr(node, 'operator') and node.operator in ('&&', '||'):
                decisions += 1

        cyclomatic_cc = float(max(1, decisions + 1))

        # Halstead Volume approximation: N * log2(n) where N = total operators+operands, n = unique operators+operands
        operators = set()
        operands = set()
        total_ops = 0

        for path, node in tree.filter(javalang.tree.BinaryOperation):
            if hasattr(node, 'operator'):
                operators.add(node.operator)
                total_ops += 1
        for path, node in tree.filter(javalang.tree.Literal):
            if hasattr(node, 'value'):
                operands.add(str(node.value))
                total_ops += 1
        for path, node in tree.filter(javalang.tree.MemberReference):
            if hasattr(node, 'member'):
                operands.add(node.member)
                total_ops += 1

        vocab = max(2, len(operators) + len(operands))
        length = max(5, total_ops + len(nodes) // 3)
        halstead_volume = round(length * math.log2(vocab), 2)
        
        # Halstead difficulty = (n1/2) * (N2/n2)
        n1 = max(1, len(operators))
        n2 = max(1, len(operands))
        N2 = max(1, total_ops)
        halstead_difficulty = round((n1 / 2.0) * (N2 / float(n2)), 2)
        halstead_effort = round(halstead_difficulty * halstead_volume, 2)

        # Maintainability Index estimation formula
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

        # Java static code smell checks
        for path, node in tree.filter(javalang.tree.CatchClause):
            if hasattr(node, 'block') and (not node.block or len(node.block) == 0):
                diagnostics.append(Diagnostic(
                    path='<submission>',
                    line=getattr(node.position, 'line', 0) if hasattr(node, 'position') and node.position else 0,
                    column=getattr(node.position, 'column', None) if hasattr(node, 'position') and node.position else None,
                    message="Empty catch block detected; swallowing exceptions prevents error diagnosis and hides runtime faults",
                    severity='warning',
                    code='empty-catch-block'
                ))

        # Check for deep nesting
        for path, node in tree.filter(javalang.tree.ForStatement):
            nesting_depth = sum(1 for p in path if isinstance(p, (javalang.tree.ForStatement, javalang.tree.WhileStatement, javalang.tree.DoStatement)))
            if nesting_depth >= 3:
                diagnostics.append(Diagnostic(
                    path='<submission>',
                    line=getattr(node.position, 'line', 0) if hasattr(node, 'position') and node.position else 0,
                    column=getattr(node.position, 'column', None) if hasattr(node, 'position') and node.position else None,
                    message=f"Deeply nested loop structure ({nesting_depth + 1} levels) creates potential O(n^{nesting_depth + 1}) bottleneck; consider restructuring with hash structures",
                    severity='warning',
                    code='deep-loop-nesting'
                ))

    except (javalang.parser.JavaSyntaxError, TypeError, javalang.tokenizer.LexerError) as exc:
        line_num = 0
        col_num = None
        if hasattr(exc, 'position') and exc.position:
            line_num = exc.position[0]
            col_num = exc.position[1]
        diagnostics.append(Diagnostic(
            path='<submission>',
            line=line_num,
            column=col_num,
            message=str(exc),
            severity='error',
            code='JavaSyntaxError',
        ))

    complexity = ComplexityMetrics(
        cyclomatic_complexity=cyclomatic_cc,
        maintainability_index=maintainability_idx,
        loc=loc,
        halstead_volume=halstead_volume,
        difficulty=halstead_difficulty if 'halstead_difficulty' in locals() else None,
        effort=halstead_effort if 'halstead_effort' in locals() else None,
        rank=rank,
    )

    return ParsedSubmission(
        submission_id='java-parse-1',
        language='java',
        source=source,
        ast_summary=ast_summary,
        complexity=complexity,
        diagnostics=diagnostics,
        static_findings=[d for d in diagnostics if d.severity != 'error'],
        metadata={}
    )
