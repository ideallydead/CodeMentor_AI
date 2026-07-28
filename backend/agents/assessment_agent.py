"""
Assessment Agent: Evaluates code correctness, standards compliance, and efficiency.

INPUT:
- ParsedSubmission: Pre-computed AST, complexity metrics, static analysis diagnostics
- SandboxResults: Test execution results (no re-execution by this agent)
- Assignment ID: To fetch the approved test suite from DB

OUTPUT:
- AssessmentReport: Deterministic scores + LLM-generated justification

DETERMINISM:
- Correctness, Standards, and Efficiency scores are always deterministic.
- Only the justification_text (LLM-generated) may vary between runs.
"""

from typing import Optional, Dict, List, Any
import logging

from backend.core.schemas import ParsedSubmission, SandboxResults, AgentOutput, Diagnostic
from backend.core.llm_client import LLMClient
from backend.agents.schemas import (
    AssessmentReport,
    FailedTestCase,
    FlaggedIssue,
)

logger = logging.getLogger(__name__)


class AssessmentEngine:
    """Deterministic scoring and issue extraction logic."""

    # THRESHOLDS (From user decisions)
    CC_WARNING_THRESHOLD = 10  # Cyclomatic complexity > 10 triggers warning
    STANDARDS_ERROR_PENALTY = -5
    STANDARDS_WARNING_PENALTY = -2
    STANDARDS_INFO_PENALTY = -0.5
    
    # Efficiency weighting (50/50 split)
    CC_WEIGHT = 0.5
    MI_WEIGHT = 0.5
    
    # CC severity bands
    CC_BANDS = [
        (5, 100),      # CC ≤ 5: 100 points
        (10, 90),      # CC 6-10: 90 points
        (15, 70),      # CC 11-15: 70 points
        (20, 40),      # CC 16-20: 40 points
        (float('inf'), 0)  # CC > 20: 0 points
    ]
    
    # Recommendation thresholds
    RECOMMENDATION_THRESHOLDS = [
        (90, "excellent"),
        (75, "good"),
        (60, "fair"),
        (0, "needs_improvement")
    ]

    @staticmethod
    def calculate_correctness_score(
        sandbox_results: SandboxResults,
    ) -> int:
        """
        Correctness = (tests_passed / total_tests) * 100
        
        Deterministic: Same test results always produce the same score.
        Timeout and wrong answer both count as "failed" equally (user decision A).
        """
        if not sandbox_results.test_results:
            # No tests run (e.g., compilation error)
            return 0
        
        total = len(sandbox_results.test_results)
        passed = sum(1 for test in sandbox_results.test_results if test.passed)
        
        score = int((passed / total) * 100)
        return score

    @staticmethod
    def calculate_standards_score(diagnostics: List[Diagnostic]) -> int:
        """
        Standards = 100 - penalties from static analysis violations.
        
        Penalties (user decision B - moderate):
        - error: -5 points each
        - warning: -2 points each
        - info: -0.5 points each
        
        Deterministic: Same diagnostics always produce the same score.
        """
        if not diagnostics:
            return 100
        
        error_count = sum(1 for d in diagnostics if d.severity == "error")
        warning_count = sum(1 for d in diagnostics if d.severity == "warning")
        info_count = sum(1 for d in diagnostics if d.severity == "info")
        
        penalty = (error_count * 5) + (warning_count * 2) + (info_count * 0.5)
        score = max(0, int(100 - penalty))
        return score

    @staticmethod
    def calculate_efficiency_score(cyclomatic_complexity: Optional[float], maintainability_index: Optional[float]) -> int:
        """
        Efficiency = 0.5 * cc_score + 0.5 * mi_score
        
        User decisions:
        - Decision 3: CC > 10 triggers warning (we use this for flagging, not scoring)
        - Decision 4: Equal 50/50 weighting for CC and MI
        - Decision 5: Keep separate, no double-count
        
        Deterministic: Same metrics always produce the same score.
        """
        cc_score = 0
        mi_score = 0
        
        # Score CC using bands
        if cyclomatic_complexity is not None:
            for threshold, points in AssessmentEngine.CC_BANDS:
                if cyclomatic_complexity <= threshold:
                    cc_score = points
                    break
        else:
            cc_score = 50  # Default if no data
        
        # Score MI (already 0-100)
        if maintainability_index is not None:
            mi_score = int(maintainability_index)
        else:
            mi_score = 50  # Default if no data
        
        # Weighted average (50/50)
        efficiency_score = int((cc_score * 0.5) + (mi_score * 0.5))
        return max(0, min(100, efficiency_score))

    @staticmethod
    def derive_recommendation(
        correctness_score: int,
        standards_score: int,
        efficiency_score: int
    ) -> str:
        """
        Recommendation band = weighted average of three scores.
        
        User decision 6: Thresholds are correct:
        - excellent ≥ 90
        - good ≥ 75
        - fair ≥ 60
        - needs_improvement < 60
        
        Deterministic: Same scores always produce the same recommendation.
        """
        # Weighted average (correctness 50%, standards 25%, efficiency 25%)
        weighted_avg = (correctness_score * 0.5) + (standards_score * 0.25) + (efficiency_score * 0.25)
        
        for threshold, band in AssessmentEngine.RECOMMENDATION_THRESHOLDS:
            if weighted_avg >= threshold:
                return band
        
        return "needs_improvement"

    @staticmethod
    def extract_failed_tests(
        sandbox_results: SandboxResults,
    ) -> List[FailedTestCase]:
        """Extract details of failed test cases from sandbox results."""
        failed = []
        for test in sandbox_results.test_results:
            if not test.passed:
                # Reason determination
                if test.error_message:
                    if "timeout" in test.error_message.lower():
                        reason = "Timeout"
                    elif "compilation" in test.error_message.lower() or "error" in test.error_message.lower():
                        reason = "Compilation or runtime error"
                    else:
                        reason = test.error_message
                else:
                    reason = "Output mismatch"
                
                failed.append(
                    FailedTestCase(
                        test_id=test.test_id,
                        input_data="<not available in sandbox results>",  # Would need test case DB
                        expected_output="<not available in sandbox results>",
                        actual_output=test.actual_output,
                        reason=reason
                    )
                )
        return failed

    @staticmethod
    def extract_flagged_issues(
        diagnostics: List[Diagnostic],
        cyclomatic_complexity: Optional[float],
        failed_tests: List[FailedTestCase]
    ) -> List[FlaggedIssue]:
        """Extract code quality issues from diagnostics and complexity metrics."""
        issues = []
        
        # Issues from static analysis diagnostics
        for diag in diagnostics:
            issues.append(
                FlaggedIssue(
                    line_number=diag.line,
                    category=diag.code or "general",
                    description=diag.message,
                    severity=diag.severity,
                    source_evidence=f"Line {diag.line}: {diag.message}"
                )
            )
        
        # Issues from complexity metrics
        if cyclomatic_complexity is not None and cyclomatic_complexity > AssessmentEngine.CC_WARNING_THRESHOLD:
            issues.append(
                FlaggedIssue(
                    line_number=0,  # Whole-file issue
                    category="complexity",
                    description=f"High cyclomatic complexity ({cyclomatic_complexity:.1f}); consider breaking into smaller functions",
                    severity="warning",
                    source_evidence=f"cyclomatic_complexity={cyclomatic_complexity:.1f}"
                )
            )
        
        # Issues from failed tests
        for test in failed_tests:
            issues.append(
                FlaggedIssue(
                    line_number=0,  # Doesn't apply to specific line
                    category="correctness",
                    description=f"Test case '{test.test_id}' failed: {test.reason}",
                    severity="error",
                    source_evidence=f"Expected: {test.expected_output}, Got: {test.actual_output}"
                )
            )
        
        return issues


class JustificationGenerator:
    """Wraps LLM client to generate narrative explanations."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()

    def generate(
        self,
        language: str,
        correctness_score: int,
        standards_score: int,
        efficiency_score: int,
        passed_tests: int,
        total_tests: int,
        failed_tests: List[FailedTestCase],
        flagged_issues: List[FlaggedIssue],
        overall_recommendation: str
    ) -> str:
        """
        Generate a narrative justification using the LLM.
        
        The LLM is responsible ONLY for phrasing; all scores are deterministic.
        """
        # Build context for LLM
        failed_tests_summary = ""
        if failed_tests:
            failed_tests_summary = "Failed tests:\n" + "\n".join(
                f"  - {t.test_id}: {t.reason}" for t in failed_tests
            )
        else:
            failed_tests_summary = "All tests passed."
        
        issues_summary = ""
        if flagged_issues:
            issues_summary = "Code issues found:\n" + "\n".join(
                f"  - Line {i.line_number} ({i.severity}): {i.description}" for i in flagged_issues[:5]  # Top 5
            )
            if len(flagged_issues) > 5:
                issues_summary += f"\n  ... and {len(flagged_issues) - 5} more issues"
        else:
            issues_summary = "No issues found."
        
        prompt = f"""You are a code reviewer for an online learning platform. Provide a brief, 
constructive justification (2-3 sentences per section) for the following assessment:

Student Submission:
- Language: {language}
- Correctness: {correctness_score}/100 ({passed_tests}/{total_tests} tests passed)
- Code Standards: {standards_score}/100
- Efficiency: {efficiency_score}/100

{failed_tests_summary}

{issues_summary}

Recommendation Band: {overall_recommendation}

Generate constructive feedback that:
1. Acknowledges what went well (if any)
2. Specifically addresses each failure with actionable next steps
3. Is encouraging but honest
4. Does NOT restate the student's code back to them
5. Is brief and to the point (max 200 words)"""

        try:
            result = self.llm_client.generate(prompt, context={
                "submission_context": {
                    "correctness": correctness_score,
                    "standards": standards_score,
                    "efficiency": efficiency_score
                }
            })
            return result.get("response", "No feedback generated.") if isinstance(result, dict) else str(result)
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return f"Assessment complete: correctness {correctness_score}%, standards {standards_score}%, efficiency {efficiency_score}%."


def assessment_agent(
    parsed_submission: ParsedSubmission,
    sandbox_results: SandboxResults,
    llm_client: Optional[LLMClient] = None
) -> AgentOutput:
    """
    Main assessment agent entry point.
    
    Args:
        parsed_submission: Pre-computed submission analysis
        sandbox_results: Sandbox execution results
        llm_client: Optional LLM client (injected for testing)
    
    Returns:
        AgentOutput: Wrapper around AssessmentReport for orchestrator integration
    """
    engine = AssessmentEngine()
    
    # Calculate deterministic scores
    correctness_score = engine.calculate_correctness_score(sandbox_results)
    standards_score = engine.calculate_standards_score(parsed_submission.diagnostics)
    efficiency_score = engine.calculate_efficiency_score(
        parsed_submission.complexity.cyclomatic_complexity,
        parsed_submission.complexity.maintainability_index
    )
    
    # Derive recommendation
    overall_recommendation = engine.derive_recommendation(
        correctness_score,
        standards_score,
        efficiency_score
    )
    
    # Extract issues
    failed_tests = engine.extract_failed_tests(sandbox_results)
    flagged_issues = engine.extract_flagged_issues(
        parsed_submission.diagnostics,
        parsed_submission.complexity.cyclomatic_complexity,
        failed_tests
    )
    
    # Generate justification
    justifier = JustificationGenerator(llm_client)
    passed_count = sum(1 for t in sandbox_results.test_results if t.passed)
    total_count = len(sandbox_results.test_results)
    
    justification_text = justifier.generate(
        language=parsed_submission.language,
        correctness_score=correctness_score,
        standards_score=standards_score,
        efficiency_score=efficiency_score,
        passed_tests=passed_count,
        total_tests=total_count,
        failed_tests=failed_tests,
        flagged_issues=flagged_issues,
        overall_recommendation=overall_recommendation
    )
    
    # Create report
    report = AssessmentReport(
        submission_id=parsed_submission.submission_id,
        correctness_score=correctness_score,
        standards_score=standards_score,
        efficiency_score=efficiency_score,
        overall_recommendation=overall_recommendation,
        failed_tests=failed_tests,
        flagged_issues=flagged_issues,
        justification_text=justification_text
    )
    
    # Wrap in AgentOutput for orchestrator
    return AgentOutput(
        agent_name="assessment_agent",
        summary=f"Correctness: {correctness_score}%, Standards: {standards_score}%, Efficiency: {efficiency_score}% | Recommendation: {overall_recommendation}",
        recommendations=["TODO: Mentor agent will provide specific improvement strategies"],
        details=report.dict()
    )
