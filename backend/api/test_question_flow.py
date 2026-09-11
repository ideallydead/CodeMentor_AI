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
    """Verify TestCase Agent generates draft test suite in HackerRank clean stdin format."""
    draft_tests = generate_draft_tests("Binary Search", "Implement binary search in array", "python")
    assert isinstance(draft_tests, list)
    assert len(draft_tests) > 0
    assert "input" in draft_tests[0]
    assert "expected_output" in draft_tests[0]
    assert isinstance(draft_tests[0]["input"], str)
    assert len(draft_tests[0]["input"]) > 0
    # Enforce HackerRank clean format: no variable names or assignment syntax
    for tc in draft_tests:
        inp = tc.get("input", "")
        assert "=" not in inp, f"Testcase input contains '=' assignment syntax: {inp}"
        assert not inp.strip().startswith("arr"), f"Testcase input starts with variable name: {inp}"


def test_hackerrank_testcase_execution_function_and_script():
    """Verify sandbox runs student code against HackerRank space/newline-separated inputs."""
    from backend.sandbox.test_suite_runner import run_test_suite_against_code

    test_cases = [
        {"id": "tc_1", "input": "1 2 3 4 5\n3", "expected_output": "2"},
        {"id": "tc_2", "input": "10 20 30 40\n20", "expected_output": "1"}
    ]

    # 1. Test student writing a function (LeetCode/HackerRank function style)
    func_source = (
        "def binary_search(nums, target):\n"
        "    return nums.index(target) if target in nums else -1\n"
    )
    res_func = run_test_suite_against_code("sub_func", func_source, "python", test_cases)
    assert res_func.compilation_error is None
    assert all(t.passed for t in res_func.test_results), f"Failed: {[t.error_message for t in res_func.test_results]}"

    # 2. Test student writing standard script reading stdin (HackerRank stdin style)
    script_source = (
        "nums = list(map(int, input().split()))\n"
        "target = int(input())\n"
        "print(nums.index(target) if target in nums else -1)\n"
    )
    res_script = run_test_suite_against_code("sub_script", script_source, "python", test_cases)
    assert res_script.compilation_error is None
    assert all(t.passed for t in res_script.test_results), f"Failed: {[t.error_message for t in res_script.test_results]}"


def test_viva_question_agent_setup():
    """Verify Viva Question Agent generates draft viva question bank from question metadata."""
    draft_viva = viva_question_agent("Binary Search", "Implement binary search in array", "python")
    assert isinstance(draft_viva, list)
    assert len(draft_viva) > 0
    assert "prompt" in draft_viva[0]
    assert "expected_concepts" in draft_viva[0]
    assert "binary search" in draft_viva[0]["prompt"].lower()


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


def test_run_code_sandbox_api():
    """Verify POST /api/run-code executes student code against assignment test cases in sandbox."""
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.db.session import init_db
    import backend.db.session as session_module
    from backend.db import models

    init_db("sqlite:///./codementor.db")
    client = TestClient(app)
    db = session_module.SessionLocal()
    try:
        assignment = models.Assignment(
            title="Two Sum Test",
            description="Find two numbers that add up to target",
            language="python",
            is_approved=True,
            draft_tests=[
                {"input": "2 7 11 15\n9", "expected_output": "0 1"},
                {"input": "3 2 4\n6", "expected_output": "1 2"}
            ]
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        code = (
            "nums = list(map(int, input().split()))\n"
            "target = int(input())\n"
            "seen = {}\n"
            "for i, n in enumerate(nums):\n"
            "    diff = target - n\n"
            "    if diff in seen:\n"
            "        print(f'{seen[diff]} {i}')\n"
            "        break\n"
            "    seen[n] = i\n"
        )
        res = client.post("/api/run-code", json={
            "assignment_id": assignment.id,
            "source_code": code,
            "language": "python"
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "completed"
        assert data["total_tests"] == 2
        assert data["passed_tests"] == 2
        assert len(data["test_results"]) == 2
        assert data["test_results"][0]["passed"] is True
        assert data["test_results"][0]["input_data"] == "2 7 11 15\n9"
        assert data["test_results"][0]["expected_output"] == "0 1"

        # Test with incorrect code (output mismatch)
        wrong_code = "print('99 99')\n"
        res_fail = client.post("/api/run-code", json={
            "assignment_id": assignment.id,
            "source_code": wrong_code,
            "language": "python"
        })
        assert res_fail.status_code == 200
        data_fail = res_fail.json()
        assert data_fail["passed_tests"] == 0
        failed_res = data_fail["test_results"][0]
        assert failed_res["passed"] is False
        assert failed_res["input_data"] == "2 7 11 15\n9"
        assert failed_res["expected_output"] == "0 1"
        assert "99 99" in failed_res["actual_output"]
        assert "Output mismatch" in failed_res["failure_reason"]
    finally:
        db.close()

