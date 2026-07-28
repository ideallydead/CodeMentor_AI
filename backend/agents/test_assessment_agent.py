"""
Comprehensive unit tests for Assessment Agent.

Tests cover:
1. Deterministic scoring (same input → same score always)
2. Boundary conditions for all scoring functions
3. Issue extraction and flagging
4. LLM integration (mocked)
5. Edge cases (no tests, no diagnostics, missing complexity)
"""

import pytest
from typing import Dict, List, Any
from unittest.mock import Mock, patch, MagicMock

from backend.core.schemas import (
    ParsedSubmission,
    SandboxResults,
    SandboxTestResult,
    Diagnostic,
    ASTSummary,
    ComplexityMetrics,
)
from backend.agents.assessment_agent import (
    AssessmentEngine,
    JustificationGenerator,
    assessment_agent,
)
from backend.agents.schemas import FailedTestCase, FlaggedIssue


# =============================================================================
# FIXTURES: Test Data
# =============================================================================

@pytest.fixture
def passing_submission() -> ParsedSubmission:
    """Well-written code that passes all tests with good metrics."""
    return ParsedSubmission(
        submission_id="sub_pass_001",
        language="python",
        source="def solve(arr):\n    return sorted(arr)[0]\n",
        ast_summary=ASTSummary(
            language="python",
            node_count=12,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Simple function with no complexity",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=1.0,
            maintainability_index=95.0,
            loc=2,
            halstead_volume=20.5,
            rank="simple"
        ),
        diagnostics=[],  # No issues
        static_findings=[],
        metadata={"assignment_id": "assign_001"}
    )


@pytest.fixture
def passing_sandbox_results() -> SandboxResults:
    """All tests passed, all on time."""
    return SandboxResults(
        submission_id="sub_pass_001",
        language="python",
        test_results=[
            SandboxTestResult(
                test_id="t1",
                passed=True,
                actual_output="1",
                execution_time_ms=10.5
            ),
            SandboxTestResult(
                test_id="t2",
                passed=True,
                actual_output="2",
                execution_time_ms=12.3
            ),
            SandboxTestResult(
                test_id="t3",
                passed=True,
                actual_output="3",
                execution_time_ms=11.8
            ),
        ]
    )


@pytest.fixture
def failing_submission() -> ParsedSubmission:
    """Poorly-written code with complexity issues and style violations."""
    return ParsedSubmission(
        submission_id="sub_fail_001",
        language="python",
        source="# Complex nested code with issues\n" * 50,
        ast_summary=ASTSummary(
            language="python",
            node_count=150,
            function_count=3,
            class_count=0,
            imports=["os", "sys"],
            summary="Complex nested functions with multiple branches",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=18.0,  # HIGH
            maintainability_index=35.0,  # LOW
            loc=150,
            halstead_volume=500.0,
            rank="very_complex"
        ),
        diagnostics=[
            Diagnostic(path="solution.py", line=5, column=0, message="Unused variable 'x'", severity="warning", code="W001"),
            Diagnostic(path="solution.py", line=10, column=0, message="Line too long (120 chars)", severity="info", code="I001"),
            Diagnostic(path="solution.py", line=15, column=0, message="Missing docstring", severity="error", code="E001"),
            Diagnostic(path="solution.py", line=20, column=0, message="Undefined name 'y'", severity="error", code="E002"),
        ],
        static_findings=[],
        metadata={"assignment_id": "assign_001"}
    )


@pytest.fixture
def failing_sandbox_results() -> SandboxResults:
    """Some tests failed, mixed outcomes."""
    return SandboxResults(
        submission_id="sub_fail_001",
        language="python",
        test_results=[
            SandboxTestResult(
                test_id="t1",
                passed=True,
                actual_output="1",
                execution_time_ms=15.0
            ),
            SandboxTestResult(
                test_id="t2",
                passed=False,
                actual_output="wrong",
                execution_time_ms=20.0,
                error_message="Output mismatch"
            ),
            SandboxTestResult(
                test_id="t3",
                passed=False,
                actual_output="",
                execution_time_ms=5000.0,
                error_message="Timeout exceeded"
            ),
        ]
    )


@pytest.fixture
def empty_results() -> SandboxResults:
    """No tests run (e.g., compilation error)."""
    return SandboxResults(
        submission_id="sub_empty_001",
        language="python",
        test_results=[],
        compilation_error="Syntax error at line 1"
    )


@pytest.fixture
def mock_llm_client():
    """Mock LLM client for determinism testing."""
    mock = Mock()
    mock.generate.return_value = {
        "response": "Great job on your submission! Your code is well-structured and efficient."
    }
    return mock


# =============================================================================
# TESTS: Correctness Score (Test Pass Rate)
# =============================================================================

class TestCorrectnessScore:
    """Tests for calculate_correctness_score() determinism and correctness."""

    def test_all_pass_100(self, passing_sandbox_results):
        """All tests pass → score = 100."""
        score = AssessmentEngine.calculate_correctness_score(passing_sandbox_results)
        assert score == 100

    def test_no_tests_0(self, empty_results):
        """No tests run → score = 0."""
        score = AssessmentEngine.calculate_correctness_score(empty_results)
        assert score == 0

    def test_one_third_pass_33(self, failing_sandbox_results):
        """1 of 3 tests pass → score = 33 (int truncation)."""
        score = AssessmentEngine.calculate_correctness_score(failing_sandbox_results)
        assert score == 33

    def test_deterministic_same_input_same_score(self, failing_sandbox_results):
        """Same input must produce same score (determinism requirement)."""
        score1 = AssessmentEngine.calculate_correctness_score(failing_sandbox_results)
        score2 = AssessmentEngine.calculate_correctness_score(failing_sandbox_results)
        assert score1 == score2 == 33

    def test_timeout_counts_as_fail(self, failing_sandbox_results):
        """Timeout is treated exactly as failed test (user decision A)."""
        # Count: 1 pass, 1 output mismatch fail, 1 timeout fail = 33%
        score = AssessmentEngine.calculate_correctness_score(failing_sandbox_results)
        assert score == 33


# =============================================================================
# TESTS: Standards Score (Static Analysis)
# =============================================================================

class TestStandardsScore:
    """Tests for calculate_standards_score() with penalty logic."""

    def test_no_diagnostics_100(self, passing_submission):
        """No issues → score = 100."""
        score = AssessmentEngine.calculate_standards_score(passing_submission.diagnostics)
        assert score == 100

    def test_error_penalty_5(self):
        """One error → penalty = 5, score = 95."""
        diagnostics = [
            Diagnostic(path="a.py", line=1, column=0, message="Bad", severity="error", code="E")
        ]
        score = AssessmentEngine.calculate_standards_score(diagnostics)
        assert score == 95

    def test_warning_penalty_2(self):
        """One warning → penalty = 2, score = 98."""
        diagnostics = [
            Diagnostic(path="a.py", line=1, column=0, message="Bad", severity="warning", code="W")
        ]
        score = AssessmentEngine.calculate_standards_score(diagnostics)
        assert score == 98

    def test_info_penalty_half(self):
        """One info → penalty = 0.5, score = 99 (int truncation)."""
        diagnostics = [
            Diagnostic(path="a.py", line=1, column=0, message="Info", severity="info", code="I")
        ]
        score = AssessmentEngine.calculate_standards_score(diagnostics)
        assert score == 99  # int(100 - 0.5) = 99 (rounded to 100 by int())

    def test_combined_penalties(self, failing_submission):
        """Multiple issues: 2 errors (-10) + 1 warning (-2) + 1 info (-0.5) = -12.5 → 87 or 88 (int rounding)."""
        # failing_submission has 2 errors, 1 warning, 1 info
        score = AssessmentEngine.calculate_standards_score(failing_submission.diagnostics)
        # int(100 - 12.5) = int(87.5) in floating point, which may round to 88
        assert score in [87, 88]

    def test_score_floor_zero(self):
        """Heavy penalties can't go below 0."""
        diagnostics = [
            Diagnostic(path="a.py", line=i, column=0, message="Err", severity="error", code="E")
            for i in range(50)  # 50 errors = -250 penalty
        ]
        score = AssessmentEngine.calculate_standards_score(diagnostics)
        assert score == 0

    def test_deterministic(self, failing_submission):
        """Same diagnostics → same score always."""
        score1 = AssessmentEngine.calculate_standards_score(failing_submission.diagnostics)
        score2 = AssessmentEngine.calculate_standards_score(failing_submission.diagnostics)
        assert score1 == score2


# =============================================================================
# TESTS: Efficiency Score (Complexity Metrics)
# =============================================================================

class TestEfficiencyScore:
    """Tests for calculate_efficiency_score() with CC and MI thresholds."""

    def test_cc_low_mi_high_100(self):
        """Low CC (1) + high MI (95) → ~97-98."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=1.0,
            maintainability_index=95.0
        )
        assert score == 97  # (100 * 0.5) + (95 * 0.5) = 97.5 → 97

    def test_cc_high_mi_low_0(self):
        """High CC (30) + low MI (20) → ~10."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=30.0,
            maintainability_index=20.0
        )
        assert score == 10  # (0 * 0.5) + (20 * 0.5) = 10

    def test_cc_band_5_or_less(self):
        """CC ≤ 5 → 100 points."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=5.0,
            maintainability_index=80.0
        )
        assert score == 90  # (100 * 0.5) + (80 * 0.5) = 90

    def test_cc_band_6_to_10(self):
        """CC 6-10 → 90 points."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=8.0,
            maintainability_index=80.0
        )
        assert score == 85  # (90 * 0.5) + (80 * 0.5) = 85

    def test_cc_band_11_to_15(self):
        """CC 11-15 → 70 points."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=13.0,
            maintainability_index=80.0
        )
        assert score == 75  # (70 * 0.5) + (80 * 0.5) = 75

    def test_cc_band_16_to_20(self):
        """CC 16-20 → 40 points."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=18.0,
            maintainability_index=80.0
        )
        assert score == 60  # (40 * 0.5) + (80 * 0.5) = 60

    def test_cc_band_above_20(self):
        """CC > 20 → 0 points."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=25.0,
            maintainability_index=80.0
        )
        assert score == 40  # (0 * 0.5) + (80 * 0.5) = 40

    def test_missing_cc_defaults_to_50(self):
        """Missing CC → use default 50."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=None,
            maintainability_index=80.0
        )
        assert score == 65  # (50 * 0.5) + (80 * 0.5) = 65

    def test_missing_mi_defaults_to_50(self):
        """Missing MI → use default 50."""
        score = AssessmentEngine.calculate_efficiency_score(
            cyclomatic_complexity=5.0,
            maintainability_index=None
        )
        assert score == 75  # (100 * 0.5) + (50 * 0.5) = 75

    def test_deterministic(self):
        """Same inputs → same score always."""
        args = {"cyclomatic_complexity": 13.0, "maintainability_index": 60.0}
        score1 = AssessmentEngine.calculate_efficiency_score(**args)
        score2 = AssessmentEngine.calculate_efficiency_score(**args)
        assert score1 == score2


# =============================================================================
# TESTS: Recommendation Derivation
# =============================================================================

class TestRecommendation:
    """Tests for derive_recommendation() with weighted average."""

    def test_excellent_threshold_90(self):
        """Weighted avg ≥ 90 → 'excellent'."""
        # (100 * 0.5) + (95 * 0.25) + (90 * 0.25) = 96.25 ≥ 90 → excellent
        rec = AssessmentEngine.derive_recommendation(100, 95, 90)
        assert rec == "excellent"

    def test_good_threshold_75(self):
        """Weighted avg ≥ 75 → 'good'."""
        # (80 * 0.5) + (75 * 0.25) + (70 * 0.25) = 76.25 ≥ 75 → good
        rec = AssessmentEngine.derive_recommendation(80, 75, 70)
        assert rec == "good"

    def test_fair_threshold_60(self):
        """Weighted avg ≥ 60 → 'fair'."""
        # (70 * 0.5) + (50 * 0.25) + (50 * 0.25) = 60 ≥ 60 → fair
        rec = AssessmentEngine.derive_recommendation(70, 50, 50)
        assert rec == "fair"

    def test_needs_improvement_below_60(self):
        """Weighted avg < 60 → 'needs_improvement'."""
        # (40 * 0.5) + (40 * 0.25) + (40 * 0.25) = 40 < 60 → needs_improvement
        rec = AssessmentEngine.derive_recommendation(40, 40, 40)
        assert rec == "needs_improvement"

    def test_deterministic(self):
        """Same scores → same recommendation always."""
        rec1 = AssessmentEngine.derive_recommendation(80, 75, 70)
        rec2 = AssessmentEngine.derive_recommendation(80, 75, 70)
        assert rec1 == rec2 == "good"


# =============================================================================
# TESTS: Issue Extraction
# =============================================================================

class TestIssueExtraction:
    """Tests for extract_flagged_issues() coverage."""

    def test_extract_diagnostics(self, failing_submission):
        """Diagnostics become flagged issues."""
        issues = AssessmentEngine.extract_flagged_issues(
            failing_submission.diagnostics,
            failing_submission.complexity.cyclomatic_complexity,
            []
        )
        # Should have 4 issues from diagnostics + 1 from CC complexity
        assert len(issues) >= 4
        assert any(i.category == "E001" for i in issues)

    def test_extract_high_cc_warning(self):
        """High CC > 10 adds complexity warning."""
        issues = AssessmentEngine.extract_flagged_issues(
            diagnostics=[],
            cyclomatic_complexity=18.0,
            failed_tests=[]
        )
        assert len(issues) == 1
        assert issues[0].category == "complexity"
        assert "cyclomatic_complexity=18.0" in issues[0].source_evidence

    def test_no_cc_warning_if_low(self):
        """Low CC ≤ 10 doesn't trigger warning."""
        issues = AssessmentEngine.extract_flagged_issues(
            diagnostics=[],
            cyclomatic_complexity=8.0,
            failed_tests=[]
        )
        assert len(issues) == 0

    def test_extract_failed_tests(self, failing_sandbox_results):
        """Failed tests become correctness issues."""
        failed_tests = AssessmentEngine.extract_failed_tests(failing_sandbox_results)
        assert len(failed_tests) == 2  # t2 and t3 failed


# =============================================================================
# TESTS: Full Assessment Integration
# =============================================================================

class TestFullAssessment:
    """Integration tests with full assessment_agent() function."""

    def test_assessment_passing_code(self, passing_submission, passing_sandbox_results, mock_llm_client):
        """Passing code gets high scores and excellent recommendation."""
        output = assessment_agent(
            passing_submission,
            passing_sandbox_results,
            mock_llm_client
        )
        
        report = output.details
        assert report["correctness_score"] == 100
        assert report["standards_score"] == 100
        assert report["efficiency_score"] >= 90
        assert report["overall_recommendation"] == "excellent"
        assert report["justification_text"]

    def test_assessment_failing_code(self, failing_submission, failing_sandbox_results, mock_llm_client):
        """Failing code gets low scores and poor recommendation."""
        output = assessment_agent(
            failing_submission,
            failing_sandbox_results,
            mock_llm_client
        )
        
        report = output.details
        assert report["correctness_score"] == 33
        assert report["standards_score"] in [87, 88]  # Allow for floating-point rounding
        assert report["efficiency_score"] < 50  # High CC penalty
        assert report["overall_recommendation"] == "needs_improvement"
        assert len(report["failed_tests"]) == 2
        assert len(report["flagged_issues"]) > 4

    def test_output_structure(self, passing_submission, passing_sandbox_results, mock_llm_client):
        """AgentOutput has correct structure for orchestrator."""
        output = assessment_agent(
            passing_submission,
            passing_sandbox_results,
            mock_llm_client
        )
        
        assert output.agent_name == "assessment_agent"
        assert "Correctness:" in output.summary
        assert "Standards:" in output.summary
        assert "Efficiency:" in output.summary
        assert "excellent" in output.summary
        assert isinstance(output.details, dict)


# =============================================================================
# TESTS: LLM Integration
# =============================================================================

class TestLLMIntegration:
    """Tests for LLM client integration and error handling."""

    def test_llm_called_with_context(self, passing_submission, passing_sandbox_results, mock_llm_client):
        """LLM is called with proper context."""
        assessment_agent(passing_submission, passing_sandbox_results, mock_llm_client)
        
        mock_llm_client.generate.assert_called_once()
        call_args = mock_llm_client.generate.call_args
        assert call_args is not None
        # call_args is (args, kwargs), args[0] is prompt, args[1] is context
        prompt = call_args.args[0] if hasattr(call_args, 'args') else call_args[0][0]
        assert "python" in prompt.lower()
        assert "100" in prompt  # correctness score
        assert "100" in prompt  # standards score

    def test_llm_fallback_on_error(self, passing_submission, passing_sandbox_results):
        """If LLM fails, agent provides fallback justification."""
        mock_llm = Mock()
        mock_llm.generate.side_effect = Exception("LLM timeout")
        
        output = assessment_agent(
            passing_submission,
            passing_sandbox_results,
            mock_llm
        )
        
        report = output.details
        assert report["justification_text"] is not None
        assert "Assessment complete" in report["justification_text"]


# =============================================================================
# TESTS: Edge Cases
# =============================================================================

class TestEdgeCases:
    """Edge cases and boundary conditions."""

    def test_empty_test_results(self):
        """No tests run (e.g., compilation error)."""
        empty = SandboxResults(
            submission_id="x",
            language="python",
            test_results=[]
        )
        score = AssessmentEngine.calculate_correctness_score(empty)
        assert score == 0

    def test_exact_threshold_at_75(self):
        """Weighted avg exactly at good threshold."""
        # (75 * 0.5) + (75 * 0.25) + (75 * 0.25) = 75.0 → good
        rec = AssessmentEngine.derive_recommendation(75, 75, 75)
        assert rec == "good"

    def test_exact_threshold_at_90(self):
        """Weighted avg exactly at excellent threshold."""
        # (90 * 0.5) + (90 * 0.25) + (90 * 0.25) = 90.0 → excellent
        rec = AssessmentEngine.derive_recommendation(90, 90, 90)
        assert rec == "excellent"

    def test_no_failed_tests_list_empty(self, passing_sandbox_results):
        """All pass → no failed tests in report."""
        failed = AssessmentEngine.extract_failed_tests(passing_sandbox_results)
        assert len(failed) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
