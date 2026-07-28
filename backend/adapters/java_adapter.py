import math
import javalang
from typing import List
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic


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
    
    cyclomatic_cc = None
    maintainability_idx = None
    rank = None
    loc = len(source.splitlines())

    try:
        tree = javalang.parse.parse(source)
        nodes = list(tree.filter(lambda n: True))
        ast_summary.node_count = len(nodes)
        ast_summary.function_count = sum(1 for path, node in tree.filter(javalang.tree.MethodDeclaration))
        ast_summary.class_count = sum(1 for path, node in tree.filter(javalang.tree.ClassDeclaration))
        ast_summary.imports = [path.path for path in tree.imports if hasattr(path, 'path')]

        # Cyclomatic complexity calculation: 1 + count of decision points
        decision_node_types = (
            javalang.tree.IfStatement,
            javalang.tree.ForStatement,
            javalang.tree.WhileStatement,
            javalang.tree.DoStatement,
            javalang.tree.CatchClause,
            javalang.tree.SwitchStatementCase,
            javalang.tree.TernaryExpression,
        )
        decisions = sum(1 for path, node in tree.filter(decision_node_types))
        
        # Check binary logical operators (&&, ||)
        for path, node in tree.filter(javalang.tree.BinaryOperation):
            if hasattr(node, 'operator') and node.operator in ('&&', '||'):
                decisions += 1

        cyclomatic_cc = max(1, decisions + 1)
        
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
        halstead_volume=None,
        rank=rank,
    )

    return ParsedSubmission(
        submission_id='java-parse-1',
        language='java',
        source=source,
        ast_summary=ast_summary,
        complexity=complexity,
        diagnostics=diagnostics,
        static_findings=[],
        metadata={}
    )

