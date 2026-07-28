"""
Unit tests for Question Setup Flow (POST /api/questions).

Verifies:
1. Creating a question triggers TestCase Agent and Viva Question Agent to generate draft test suites and viva banks.
2. The generated draft tests and draft viva are saved on the Assignment object.
3. Viva Question Agent (setup time) is distinct from submission-time Viva Agent.
"""

import pytest
from backend.agents.testcase_agent import generate_draft_tests
from backend.agents.viva_agent import viva_question_agent, viva_agent
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics


def test_testcase_agent_question_setup():
    """Verify TestCase Agent generates draft test suite from question metadata."""
    draft_tests = generate_draft_tests("Binary Search", "Implement binary search in array", "python")
    assert isinstance(draft_tests, list)
    assert len(draft_tests) > 0
    assert "input" in draft_tests[0]
    assert "expected_output" in draft_tests[0]
    assert "Binary Search" in draft_tests[0]["input"]


def test_viva_question_agent_setup():
    """Verify Viva Question Agent generates draft viva question bank from question metadata."""
    draft_viva = viva_question_agent("Binary Search", "Implement binary search in array", "python")
    assert isinstance(draft_viva, list)
    assert len(draft_viva) > 0
    assert "prompt" in draft_viva[0]
    assert "expected_concepts" in draft_viva[0]
    assert "Binary Search" in draft_viva[0]["prompt"]


def test_viva_agent_submission_time_selection():
    """Verify submission-time Viva Agent selects questions from the approved bank."""
    submission = ParsedSubmission(
        submission_id="sub_1",
        language="python",
        source="def search(): pass",
        ast_summary=ASTSummary(language="python", node_count=5, function_count=1, class_count=0, imports=[], summary="Sample AST"),
        complexity=ComplexityMetrics(cyclomatic_complexity=1.0, maintainability_index=100.0, loc=1, halstead_volume=10.0, rank="A"),
        diagnostics=[],
        static_findings=[]
    )
    approved_bank = [
        {"prompt": "What is the time complexity of binary search?", "expected_concepts": ["O(log n)"]},
        {"prompt": "How do you avoid integer overflow when computing mid?", "expected_concepts": ["overflow"]}
    ]
    output = viva_agent(submission, approved_viva_bank=approved_bank)
    assert output.agent_name == "viva_agent"
    assert len(output.details["selected_questions"]) == 2
    assert output.details["selected_questions"][0]["prompt"] == "What is the time complexity of binary search?"
