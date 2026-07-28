import pytest
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics
from backend.core.ast_normalizer import normalize_ast
from backend.agents.integrity_agent import integrity_agent
from backend.agents.schemas import IntegrityReport


def create_mock_parsed_submission(sub_id: str, source: str, language: str = 'python') -> ParsedSubmission:
    norm = normalize_ast(source, language)
    return ParsedSubmission(
        submission_id=sub_id,
        language=language,
        source=source,
        ast_summary=ASTSummary(
            language=language,
            node_count=norm['node_count'],
            function_count=1,
            class_count=0,
            imports=[],
            summary="Mock AST summary"
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=2.0,
            maintainability_index=85.0,
            loc=len(source.splitlines()),
            halstead_volume=100.0,
            rank='A'
        ),
        diagnostics=[],
        static_findings=[]
    )


def test_ast_normalization():
    py_code = """
def calculate(a, b):
    # Sum elements
    total = 0
    for x in a:
        total += x
    return total
"""
    norm = normalize_ast(py_code, 'python')
    assert norm['node_count'] > 0
    assert len(norm['k_grams']) > 0
    assert norm['fingerprint_hash'] != ""


def test_integrity_agent_renamed_variables():
    source_original = """
def find_max(numbers):
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val
"""
    source_renamed = """
def get_highest_item(items_list):
    highest = items_list[0]
    for element in items_list:
        if element > highest:
            highest = element
    return highest
"""
    parsed_target = create_mock_parsed_submission("sub_new", source_renamed)
    historical = [
        {"id": "sub_old", "student_id": 42, "source_code": source_original, "language": "python"}
    ]

    agent_output = integrity_agent(parsed_target, historical_submissions=historical)
    assert agent_output.agent_name == 'integrity_agent'
    
    report_dict = agent_output.details
    assert report_dict['risk_level'] in ('high', 'moderate')
    assert report_dict['max_similarity_score'] >= 70.0
    assert len(report_dict['matches']) == 1
    assert report_dict['matches'][0]['matched_submission_id'] == 'sub_old'
    assert any(p['pattern_type'] == 'identifier_renaming' for p in report_dict['matches'][0]['refactoring_patterns'])


def test_integrity_agent_distinct_code():
    source1 = """
def is_even(n):
    return n % 2 == 0
"""
    source2 = """
class MatrixMultiplier:
    def multiply(self, A, B):
        result = []
        for i in range(len(A)):
            row = []
            for j in range(len(B[0])):
                row.append(sum(A[i][k] * B[k][j] for k in range(len(B))))
            result.append(row)
        return result
"""
    parsed_target = create_mock_parsed_submission("sub_matrix", source2)
    historical = [
        {"id": "sub_even", "student_id": 10, "source_code": source1, "language": "python"}
    ]

    agent_output = integrity_agent(parsed_target, historical_submissions=historical)
    report_dict = agent_output.details
    assert report_dict['risk_level'] == 'low'
    assert report_dict['max_similarity_score'] < 30.0
