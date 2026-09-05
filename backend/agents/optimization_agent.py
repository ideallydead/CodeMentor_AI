"""
Optimization Agent: Analyzes code efficiency, estimates Big-O time and space complexity,
identifies performance bottlenecks, and provides actionable refactoring recommendations.

INPUT:
- ParsedSubmission: Pre-computed AST summary, complexity metrics, source code

OUTPUT:
- OptimizationReport: Estimated time/space complexity, findings list, and overall summary.
"""

import re
import logging
from typing import List, Dict, Any, Optional

from backend.core.schemas import ParsedSubmission, AgentOutput
from backend.core.llm_client import LLMClient, get_agent_llm_client
from backend.agents.schemas import OptimizationFinding, OptimizationReport

logger = logging.getLogger(__name__)


class OptimizationEngine:
    """Deterministic logic for performance bottleneck detection and Big-O estimation."""

    @staticmethod
    def estimate_time_complexity(source: str, ast_summary: Any) -> str:
        """Estimate Big-O time complexity based on nested loops and recursion."""
        lines = source.splitlines()
        max_loop_nesting = 0
        current_nesting = 0

        for line in lines:
            stripped = line.strip()
            if re.search(r'\b(for|while)\b', stripped):
                current_nesting += 1
                if current_nesting > max_loop_nesting:
                    max_loop_nesting = current_nesting
            elif stripped and not line.startswith(' ') and not line.startswith('\t'):
                current_nesting = 0

        if max_loop_nesting >= 3:
            return "O(n^3)"
        elif max_loop_nesting == 2:
            return "O(n^2)"
        elif max_loop_nesting == 1:
            return "O(n)"
        else:
            return "O(1)"

    @staticmethod
    def estimate_space_complexity(source: str, language: str) -> str:
        """Estimate Big-O space complexity based on allocations and data structures."""
        source_lower = source.lower()
        if re.search(r'\b(list|dict|set|vector|arraylist|map|hashmap|malloc|new)\b', source_lower):
            return "O(n)"
        return "O(1)"

    @staticmethod
    def detect_findings(parsed_submission: ParsedSubmission) -> List[OptimizationFinding]:
        """Detect deterministic performance findings in source code."""
        findings: List[OptimizationFinding] = []
        source = parsed_submission.source
        language = (parsed_submission.language or "").lower()
        complexity = parsed_submission.complexity
        lines = source.splitlines()

        # 1. Check for nested loops
        for idx, line in enumerate(lines, start=1):
            if re.search(r'\b(for|while)\b', line):
                for inner_idx in range(idx, min(idx + 5, len(lines))):
                    if re.search(r'\b(for|while)\b', lines[inner_idx]):
                        findings.append(
                            OptimizationFinding(
                                issue_type="nested_loops",
                                line_number=idx,
                                description="Nested loop detected resulting in potential quadratic O(n^2) runtime",
                                complexity_impact="Increases time complexity to O(n^2)",
                                suggested_optimization="Consider using a Hash Map or set lookup to reduce time complexity to O(n)"
                            )
                        )
                        break

        # 2. Check for repeated string concatenation in loops
        if language in ('python', 'java'):
            for idx, line in enumerate(lines, start=1):
                if ('+=' in line or 'cat' in line) and ('for ' in line or 'while ' in line):
                    findings.append(
                        OptimizationFinding(
                            issue_type="redundant_allocation",
                            line_number=idx,
                            description="Repeated string concatenation inside loop causes repeated memory allocations",
                            complexity_impact="Increases memory overhead to O(n^2)",
                            suggested_optimization="Use list joining in Python (''.join()) or StringBuilder in Java for O(n) memory allocation"
                        )
                    )

        # 3. Check for high cyclomatic complexity
        if complexity and complexity.cyclomatic_complexity and complexity.cyclomatic_complexity > 10:
            findings.append(
                OptimizationFinding(
                    issue_type="high_cyclomatic_complexity",
                    line_number=0,
                    description=f"High cyclomatic complexity ({complexity.cyclomatic_complexity}) increases branch mispredictions and limits inline optimizations",
                    complexity_impact="Reduces runtime execution efficiency and maintainability",
                    suggested_optimization="Refactor long nested branching into smaller helper functions with early returns"
                )
            )

        return findings


class OptimizationJustificationGenerator:
    """Generates narrative performance optimization summary using LLMClient with fallback."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()

    def generate(
        self,
        language: str,
        time_comp: str,
        space_comp: str,
        findings: List[OptimizationFinding]
    ) -> str:
        """Generate high-level performance summary text."""
        findings_summary = "\n".join(f"- {f.issue_type}: {f.description}" for f in findings) if findings else "No critical bottlenecks."
        prompt = f"""You are a performance optimization engineer.
Analyze the following code performance profile:
Language: {language}
Estimated Time Complexity: {time_comp}
Estimated Space Complexity: {space_comp}

Findings:
{findings_summary}

Write a 2-3 sentence performance summary offering high-level optimization guidance.
Do NOT output full code solutions."""

        try:
            result = self.llm_client.generate(prompt, context={"time_complexity": time_comp})
            text = result.get("response", "") if isinstance(result, dict) else str(result)
            if text and "TODO: LLM integration pending" not in text and "Fallback response after API exception" not in text:
                return text
        except Exception as exc:
            logger.error(f"LLM optimization summary generation failed: {exc}")

        # Deterministic fallback text
        if findings:
            return (
                f"The submission has an estimated time complexity of {time_comp} and space complexity of {space_comp}. "
                f"Identified {len(findings)} potential performance bottleneck(s) that can be optimized by using efficient data structures and reducing nested iterations."
            )
        else:
            return (
                f"The submission demonstrates efficient algorithmic performance with estimated time complexity of {time_comp} "
                f"and space complexity of {space_comp}. No major performance bottlenecks detected."
            )


def optimization_agent(
    parsed_submission: ParsedSubmission,
    llm_client: Optional[LLMClient] = None
) -> AgentOutput:
    """
    Main entry point for Optimization Agent.
    
    Args:
        parsed_submission: ParsedSubmission containing source and metrics
        llm_client: Optional LLMClient wrapper instance
        
    Returns:
        AgentOutput wrapping OptimizationReport
    """
    if llm_client is None:
        llm_client = get_agent_llm_client("optimization_agent")

    engine = OptimizationEngine()
    time_comp = engine.estimate_time_complexity(parsed_submission.source, parsed_submission.ast_summary)
    space_comp = engine.estimate_space_complexity(parsed_submission.source, parsed_submission.language)
    findings = engine.detect_findings(parsed_submission)

    generator = OptimizationJustificationGenerator(llm_client)
    overall_summary = generator.generate(
        language=parsed_submission.language,
        time_comp=time_comp,
        space_comp=space_comp,
        findings=findings
    )

    report = OptimizationReport(
        estimated_time_complexity=time_comp,
        estimated_space_complexity=space_comp,
        findings=findings,
        overall_summary=overall_summary
    )

    recommendations = [f"Line {f.line_number}: {f.suggested_optimization}" if f.line_number > 0 else f.suggested_optimization for f in findings]
    if not recommendations:
        recommendations = [f"Maintain O({time_comp}) execution efficiency and O({space_comp}) space allocation."]

    details_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()

    return AgentOutput(
        agent_name="optimization_agent",
        summary=overall_summary,
        recommendations=recommendations,
        details=details_dict
    )
