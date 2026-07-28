"""
Comprehensive unit tests for Socratic Mentor Agent.

Tests cover:
1. Perfect submission (Praise path: positive encouragement, empty hints list)
2. Failing submission (Socratic path: non-empty hints, deduplication, max 5 limit, suggested reading)
3. Socratic constraint enforcement (zero code snippets in hints or questions)
4. LLM failure and fallback path (graceful degradation using deterministic text)
5. Robustness when AssessmentReport is missing/None
"""

import pytest
from unittest.mock import Mock, patch
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic
from backend.agents.schemas import (
    AssessmentReport,
    FailedTestCase,
    FlaggedIssue,
    MentorReport,
    MentorHint,
)
from backend.agents.mentor_agent import (
    MentorEngine,
    MentorJustificationGenerator,
    mentor_agent,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def perfect_submission() -> ParsedSubmission:
    return ParsedSubmission(
        submission_id="sub_perfect_001",
        language="python",
        source="def add(a, b):\n    return a + b\n",
        ast_summary=ASTSummary(
            language="python",
            node_count=10,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Simple function",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=1.0,
            maintainability_index=95.0,
            loc=2,
            halstead_volume=10.0,
            rank="A"
        ),
        diagnostics=[],
        static_findings=[],
        metadata={}
    )


@pytest.fixture
def perfect_assessment() -> AssessmentReport:
    return AssessmentReport(
        submission_id="sub_perfect_001",
        correctness_score=100,
        standards_score=100,
        efficiency_score=100,
        overall_recommendation="excellent",
        failed_tests=[],
        flagged_issues=[],
        justification_text="All tests passed cleanly."
    )


@pytest.fixture
def failing_submission() -> ParsedSubmission:
    return ParsedSubmission(
        submission_id="sub_fail_001",
        language="python",
        source="def get_item(arr, idx):\n    return arr[idx + 1]\n",
        ast_summary=ASTSummary(
            language="python",
            node_count=25,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Function with potential index out of bounds",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=12.0,
            maintainability_index=55.0,
            loc=15,
            halstead_volume=120.0,
            rank="C"
        ),
        diagnostics=[
            Diagnostic(
                path="<submission>",
                line=2,
                column=4,
                message="Possible list index out of range",
                severity="error",
                code="boundary_error"
            )
        ],
        static_findings=[],
        metadata={}
    )


@pytest.fixture
def failing_assessment() -> AssessmentReport:
    return AssessmentReport(
        submission_id="sub_fail_001",
        correctness_score=33,
        standards_score=70,
        efficiency_score=60,
        overall_recommendation="needs_improvement",
        failed_tests=[
            FailedTestCase(
                test_id="t1",
                input_data="[1, 2, 3], 2",
                expected_output="3",
                actual_output="IndexError: list index out of range",
                reason="Index out of range"
            ),
            FailedTestCase(
                test_id="t2",
                input_data="[10, 20], 1",
                expected_output="20",
                actual_output="IndexError: list index out of range",
                reason="Index out of range"
            ),
            FailedTestCase(
                test_id="t3",
                input_data="[5], 0",
                expected_output="5",
                actual_output="Timeout during execution",
                reason="Timeout during execution"
            )
        ],
        flagged_issues=[
            FlaggedIssue(
                line_number=2,
                category="correctness",
                description="List index out of range on edge inputs",
                severity="error",
                source_evidence="IndexError"
            ),
            FlaggedIssue(
                line_number=0,
                category="complexity",
                description="High cyclomatic complexity (12.0)",
                severity="warning",
                source_evidence="cyclomatic_complexity=12.0"
            )
        ],
        justification_text="The code fails on array bounds and times out."
    )


@pytest.fixture
def mock_llm_client() -> Mock:
    client = Mock()
    client.generate.return_value = {
        "response": "Keep up the momentum! Thinking through your loop conditions will help resolve the boundary errors."
    }
    return client


# =============================================================================
# TESTS: Perfect Submissions (Praise Path)
# =============================================================================

class TestPerfectSubmissionPath:

    def test_perfect_submission_generates_empty_hints(self, perfect_submission, perfect_assessment):
        output = mentor_agent(perfect_submission, perfect_assessment)
        details = output.details
        assert len(details["hints"]) == 0

    def test_perfect_submission_generates_positive_encouragement(self, perfect_submission, perfect_assessment, mock_llm_client):
        output = mentor_agent(perfect_submission, perfect_assessment, llm_client=mock_llm_client)
        assert output.agent_name == "mentor_agent"
        assert len(output.summary) > 0

    def test_perfect_submission_fallback_text(self, perfect_submission, perfect_assessment):
        broken_llm = Mock()
        broken_llm.generate.side_effect = RuntimeError("API error")
        output = mentor_agent(perfect_submission, perfect_assessment, llm_client=broken_llm)
        assert "Excellent work" in output.summary or "cleanly" in output.summary


# =============================================================================
# TESTS: Failing Submissions (Socratic Path)
# =============================================================================

class TestFailingSubmissionPath:

    def test_failing_submission_generates_hints(self, failing_submission, failing_assessment):
        output = mentor_agent(failing_submission, failing_assessment)
        details = output.details
        assert len(details["hints"]) > 0

    def test_hints_are_socratic_and_contain_no_code(self, failing_submission, failing_assessment):
        output = mentor_agent(failing_submission, failing_assessment)
        hints = output.details["hints"]
        for h in hints:
            question = h["socratic_question"]
            # Verify no direct code snippets
            assert "def " not in question
            assert "return " not in question
            assert "{" not in question and "}" not in question
            # Verify question mark ending
            assert question.endswith("?")

    def test_hints_deduplicate_same_topic(self, failing_submission, failing_assessment):
        hints = MentorEngine.generate_socratic_hints(
            failing_assessment.failed_tests,
            failing_assessment.flagged_issues,
            failing_assessment.correctness_score,
            failing_submission
        )
        topics = [h.topic for h in hints]
        assert len(topics) == len(set(topics))

    def test_hints_limited_to_max_five(self, failing_submission):
        many_failures = [
            FailedTestCase(test_id=f"t{i}", input_data="data", expected_output="1", actual_output="0", reason=f"error_{i}")
            for i in range(10)
        ]
        hints = MentorEngine.generate_socratic_hints(many_failures, [], 0, failing_submission)
        assert len(hints) <= 5

    def test_suggested_reading_derivation(self, failing_submission, failing_assessment):
        topics = MentorEngine.derive_suggested_reading(
            failing_assessment.flagged_issues,
            failing_submission.complexity
        )
        assert len(topics) >= 3
        assert len(topics) <= 5
        assert any("Complexity" in t for t in topics) or any("Indexing" in t for t in topics)


# =============================================================================
# TESTS: LLM Fallback & Graceful Degradation
# =============================================================================

class TestLLMFallbackPath:

    def test_llm_error_uses_deterministic_fallback(self, failing_submission, failing_assessment):
        broken_llm = Mock()
        broken_llm.generate.side_effect = RuntimeError("LLM Timeout")
        output = mentor_agent(failing_submission, failing_assessment, llm_client=broken_llm)
        assert output.agent_name == "mentor_agent"
        assert len(output.details["hints"]) > 0
        assert "Great effort" in output.summary or "33%" in output.summary


# =============================================================================
# TESTS: Missing AssessmentReport Handling
# =============================================================================

class TestMissingAssessmentReport:

    def test_handles_missing_assessment_report_gracefully(self, failing_submission):
        output = mentor_agent(failing_submission, assessment_report=None)
        assert output.agent_name == "mentor_agent"
        assert "hints" in output.details
        assert "suggested_reading" in output.details
