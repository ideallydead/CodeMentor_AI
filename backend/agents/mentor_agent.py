"""
Mentor Agent: Provides Socratic conceptual feedback based on AST summary, complexity metrics,
static analysis diagnostics, and AssessmentReport findings.

INPUT:
- ParsedSubmission: Pre-computed AST summary, complexity metrics, static analysis diagnostics
- AssessmentReport (optional): Assessment results containing failed tests and flagged issues

OUTPUT:
- MentorReport: Overall encouragement, Socratic hints, suggested reading, and detected concepts.

CONSTRAINTS:
- Follows Socratic principles: NEVER provides direct code fixes or code solutions.
- Deduplicates hints by topic and limits hints to maximum 5.
- Uses LLMClient for narrative encouragement with deterministic fallbacks.
"""

from typing import Optional, Dict, List, Any
import logging

from backend.core.schemas import ParsedSubmission, AgentOutput, ComplexityMetrics
from backend.core.llm_client import LLMClient
from backend.agents.schemas import (
    AssessmentReport,
    FailedTestCase,
    FlaggedIssue,
    MentorReport,
    MentorHint,
    DetectedConcept,
)

logger = logging.getLogger(__name__)


# Standard mapping of failure categories to Socratic questions and review topics
SOCRATIC_HINT_TEMPLATES = {
    "boundary_conditions": {
        "question": "What happens at the very beginning and end of your array or sequence? Can your loop handle those boundary positions?",
        "review": "Array indexing and loop bounds"
    },
    "logic_error": {
        "question": "Trace through your algorithm step-by-step with a small sample input. Does each iteration produce the expected intermediate state?",
        "review": "Algorithmic logic and state tracking"
    },
    "performance_issue": {
        "question": "Consider how the operation count grows as your input size increases. Could any nested loops or redundant calculations be streamlined?",
        "review": "Algorithmic efficiency and Big O notation"
    },
    "style_issue": {
        "question": "How can your code be structured or named to make its intent immediately clear to another developer reviewing it?",
        "review": "Clean code standards and refactoring"
    },
    "complexity": {
        "question": "Could this function be broken down into smaller, single-responsibility helper functions to improve readability?",
        "review": "Modular function design and cyclomatic complexity"
    }
}


class MentorEngine:
    """Deterministic logic for Socratic hint extraction, failure categorization, and reading recommendations."""

    @staticmethod
    def categorize_failure(failed_test: FailedTestCase, parsed_submission: ParsedSubmission) -> str:
        """
        Categorize a test failure into a pedagogical topic.
        
        Logic:
        - Reason contains "Timeout" or high CC -> "performance_issue"
        - Reason contains "index" or "bounds" -> "boundary_conditions"
        - General mismatch -> "logic_error"
        """
        reason_lower = (failed_test.reason or "").lower()
        if "timeout" in reason_lower:
            return "performance_issue"
        if "index" in reason_lower or "bound" in reason_lower or "out of range" in reason_lower:
            return "boundary_conditions"
        return "logic_error"

    @staticmethod
    def generate_socratic_hints(
        failed_tests: List[FailedTestCase],
        flagged_issues: List[FlaggedIssue],
        correctness_score: int,
        parsed_submission: ParsedSubmission
    ) -> List[MentorHint]:
        """
        Generate deduplicated Socratic hints (max 5) focusing on conceptual discovery without code solutions.
        """
        if correctness_score == 100 and not failed_tests:
            return []

        hints: List[MentorHint] = []
        seen_topics = set()

        # 1. Generate hints for failed tests
        for test in failed_tests:
            topic = MentorEngine.categorize_failure(test, parsed_submission)
            if topic not in seen_topics:
                template = SOCRATIC_HINT_TEMPLATES.get(
                    topic,
                    {
                        "question": "What assumptions is your code making about the input data structure?",
                        "review": "Input validation and edge case handling"
                    }
                )
                hints.append(
                    MentorHint(
                        topic=topic,
                        socratic_question=template["question"],
                        concept_to_review=template["review"]
                    )
                )
                seen_topics.add(topic)

        # 2. Generate hints for flagged issues (complexity, style, performance)
        for issue in flagged_issues:
            cat_lower = (issue.category or "").lower()
            topic = "complexity" if "complexity" in cat_lower else ("style_issue" if "style" in cat_lower else "logic_error")
            if topic not in seen_topics:
                template = SOCRATIC_HINT_TEMPLATES.get(topic, SOCRATIC_HINT_TEMPLATES["style_issue"])
                hints.append(
                    MentorHint(
                        topic=topic,
                        socratic_question=template["question"],
                        concept_to_review=template["review"]
                    )
                )
                seen_topics.add(topic)

        # Limit to top 5 hints to avoid cognitive overload
        return hints[:5]

    @staticmethod
    def derive_suggested_reading(
        flagged_issues: List[FlaggedIssue],
        complexity: Optional[ComplexityMetrics]
    ) -> List[str]:
        """
        Derive 3-5 recommended reading topics based on flagged issues and complexity metrics.
        """
        topics: List[str] = []
        seen = set()

        def add_topic(name: str):
            if name not in seen:
                topics.append(name)
                seen.add(name)

        if complexity and complexity.cyclomatic_complexity is not None and complexity.cyclomatic_complexity > 10:
            add_topic("Cyclomatic Complexity and Refactoring")
            add_topic("Big O Notation and Time Complexity")

        if complexity and complexity.maintainability_index is not None and complexity.maintainability_index < 60:
            add_topic("Code Maintainability Best Practices")

        for issue in flagged_issues:
            cat = (issue.category or "").lower()
            if "correctness" in cat:
                add_topic("Edge Case Analysis and Unit Testing")
                add_topic("Array Indexing and Loop Invariants")
            elif "style" in cat:
                add_topic("Clean Code Guidelines")

        # Defaults if list is short
        defaults = [
            "Debugging Strategies and Manual Tracing",
            "Data Structure Fundamentals",
            "Input Constraints and Guard Clauses"
        ]
        for default_item in defaults:
            if len(topics) >= 5:
                break
            add_topic(default_item)

        return topics[:5]

    @staticmethod
    def detect_concepts(parsed_submission: ParsedSubmission) -> List[DetectedConcept]:
        """
        Derive core programming concepts deterministically from structured AST summary data.
        """
        concepts: List[DetectedConcept] = []
        seen_names = set()
        ast = parsed_submission.ast_summary
        metadata = ast.metadata or {}

        if ast.class_count > 0:
            concept_name = "class_inheritance" if (ast.language or "").lower() == "java" else "class_definition"
            concepts.append(DetectedConcept(concept_name=concept_name, ast_evidence=f"class_count={ast.class_count}"))
            seen_names.add(concept_name)

        if ast.function_count > 0 and metadata.get("has_recursion"):
            concepts.append(DetectedConcept(concept_name="recursion", ast_evidence="Recursive AST node self-call"))
            seen_names.add("recursion")

        if metadata.get("has_list_comp"):
            concepts.append(DetectedConcept(concept_name="list_comprehension", ast_evidence="ListComp node"))
            seen_names.add("list_comprehension")

        return concepts


class MentorJustificationGenerator:
    """Generates growth-mindset narrative encouragement using LLMClient with deterministic fallbacks."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()

    def generate(
        self,
        language: str,
        correctness_score: int,
        is_perfect: bool,
        hints: List[MentorHint],
        failed_tests_count: int
    ) -> str:
        """
        Generate encouraging growth-mindset text.
        """
        if is_perfect:
            prompt = f"""You are an encouraging computer science mentor.
The student submitted a solution in {language} that passed ALL tests with a 100% score!
Write a concise, 2-3 sentence praise acknowledging their effort and encouraging them to explore next-level conceptual optimizations.
Do NOT include any source code solutions."""
        else:
            hints_summary = "\n".join(f"- {h.topic}: {h.socratic_question}" for h in hints)
            prompt = f"""You are an encouraging computer science mentor.
The student submitted a {language} solution that passed {correctness_score}% of tests ({failed_tests_count} failing).
Write a supportive, encouraging 2-3 sentence feedback acknowledging their progress and guiding them to think about boundary cases.
Do NOT provide source code solutions.

Focus areas:
{hints_summary}"""

        try:
            result = self.llm_client.generate(prompt, context={"correctness": correctness_score})
            text = result.get("response", "") if isinstance(result, dict) else str(result)
            if text and "TODO: LLM integration pending" not in text and "Fallback response after API exception" not in text:
                return text
        except Exception as exc:
            logger.error(f"LLM encouragement generation failed: {exc}")

        # Deterministic fallback text
        if is_perfect:
            return (
                "Excellent work! Your solution passes all test cases cleanly. "
                "Challenge yourself by analyzing its time and space complexity or exploring alternative algorithmic approaches."
            )
        else:
            return (
                f"Great effort on this submission! You have built a solid foundation ({correctness_score}% tests passing). "
                "Take a moment to manually trace through edge cases and loop boundaries to refine your solution further."
            )


def mentor_agent(
    parsed_submission: ParsedSubmission,
    assessment_report: Optional[AssessmentReport] = None,
    llm_client: Optional[LLMClient] = None
) -> AgentOutput:
    """
    Main entry point for Socratic Mentor Agent.
    
    Args:
        parsed_submission: ParsedSubmission containing AST and complexity data
        assessment_report: Optional AssessmentReport from assessment_agent
        llm_client: Optional LLMClient wrapper instance
        
    Returns:
        AgentOutput wrapping MentorReport details
    """
    engine = MentorEngine()

    if assessment_report:
        correctness_score = assessment_report.correctness_score
        failed_tests = assessment_report.failed_tests
        flagged_issues = assessment_report.flagged_issues
    else:
        # Fallback if assessment_report is not supplied
        failed_tests = []
        flagged_issues = [
            FlaggedIssue(
                line_number=diag.line,
                category=diag.code or "general",
                description=diag.message,
                severity=diag.severity,
                source_evidence=f"Line {diag.line}: {diag.message}"
            )
            for diag in parsed_submission.diagnostics
        ]
        correctness_score = 100 if not parsed_submission.diagnostics else 75

    is_perfect = (correctness_score == 100 and len(failed_tests) == 0)

    # 1. Generate Socratic hints (empty if perfect score)
    hints = engine.generate_socratic_hints(failed_tests, flagged_issues, correctness_score, parsed_submission)

    # 2. Derive suggested reading topics
    suggested_reading = engine.derive_suggested_reading(flagged_issues, parsed_submission.complexity)

    # 3. Detect AST concepts
    concepts_detected = engine.detect_concepts(parsed_submission)

    # 4. Generate overall encouragement using LLM with fallback
    generator = MentorJustificationGenerator(llm_client)
    overall_encouragement = generator.generate(
        language=parsed_submission.language,
        correctness_score=correctness_score,
        is_perfect=is_perfect,
        hints=hints,
        failed_tests_count=len(failed_tests)
    )

    report = MentorReport(
        overall_encouragement=overall_encouragement,
        hints=hints,
        suggested_reading=suggested_reading,
        concepts_detected=concepts_detected
    )

    details_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()

    return AgentOutput(
        agent_name="mentor_agent",
        summary=overall_encouragement,
        recommendations=[h.socratic_question for h in hints],
        details=details_dict
    )
