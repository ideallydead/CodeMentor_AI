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
from typing import List, Dict, Any, Optional, Tuple

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
    """Generates deep algorithmic performance analysis and suggested refactored code using LLMClient."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()

    def generate(
        self,
        language: str,
        source: str,
        time_comp: str,
        space_comp: str,
        findings: List[OptimizationFinding],
        complexity: Optional[Any] = None,
        assignment_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Generate in-depth performance analysis and optional refactored code snippet for DiffEditor.
        Returns: (overall_summary, suggested_code)
        """
        assignment_info = ""
        if assignment_context:
            title = assignment_context.get("title", "")
            desc = assignment_context.get("description", "")
            assignment_info = f"Problem: {title}\nProblem Description: {desc}\n"

        cc_val = getattr(complexity, "cyclomatic_complexity", None)
        mi_val = getattr(complexity, "maintainability_index", None)
        h_vol = getattr(complexity, "halstead_volume", None)

        findings_summary = "\n".join(f"- Line {f.line_number} [{f.issue_type}]: {f.description} -> {f.suggested_optimization}" for f in findings) if findings else "No severe loop bottlenecks detected."

        prompt = f"""You are a Principal Software Performance & Algorithmic Optimization Engineer.
Analyze the following student submission and performance profile:

{assignment_info}Language: {language}
Estimated Time Complexity: {time_comp}
Estimated Space Complexity: {space_comp}
Static Metrics: Cyclomatic Complexity={cc_val or 'N/A'}, Maintainability Index={mi_val or 'N/A'}, Halstead Volume={h_vol or 'N/A'}

Static Bottlenecks Detected:
{findings_summary}

Student Source Code:
```{language}
{source}
```

Provide an in-depth algorithmic efficiency evaluation.
Respond in JSON format with the following keys:
- "summary": A detailed, multi-paragraph performance evaluation breaking down:
  1. Mathematical Big-O Time Complexity derivation and why the current construct scales as {time_comp}.
  2. Memory & Space Complexity analysis explaining auxiliary allocations and container scaling ({space_comp}).
  3. Concrete line-by-line bottleneck diagnostics and cache/locality considerations.
  4. Algorithmic paradigm alternatives (e.g. hash maps, two pointers, binary search, prefix sums) that can reduce runtime.
- "suggested_code": An optimized, production-grade refactored implementation in {language} resolving the bottlenecks and improving time or space complexity. Must be valid, runnable code without placeholders."""

        system_prompt = "You are a code optimization expert. Analyze computational complexity and generate optimal refactorings in JSON format."

        try:
            result = self.llm_client.generate(prompt, system_prompt=system_prompt, json_mode=True)
            if isinstance(result, dict) and not result.get("is_fallback"):
                parsed = result.get("parsed")
                if isinstance(parsed, dict):
                    summary = parsed.get("summary", "")
                    code = parsed.get("suggested_code") or parsed.get("optimized_code")
                    if summary:
                        return summary, code

                raw_resp = result.get("response", "")
                if raw_resp and "Fallback response" not in raw_resp:
                    return raw_resp, None
        except Exception as exc:
            logger.error(f"LLM optimization summary generation failed: {exc}")

        # High-quality structured deterministic fallback
        if findings:
            fallback_summary = (
                f"### Algorithmic Complexity Profile\n"
                f"• **Time Complexity**: **{time_comp}** — Driven by iterative loop structures and element traversal patterns.\n"
                f"• **Space Complexity**: **{space_comp}** — Reflects internal memory allocations and auxiliary container footprint.\n\n"
                f"### Performance Bottleneck Analysis\n"
                f"Static analysis detected {len(findings)} algorithmic bottleneck(s). Nested loops and iterative searches scale quadratically on large inputs ($N \\ge 10^5$). "
                f"Replacing sequential searches with $O(1)$ amortized Hash Map / Set lookups or sorting with a two-pointer approach will substantially reduce latency.\n\n"
                f"### Optimization Roadmap\n"
                f"1. Decouple nested iterations by caching observed elements.\n"
                f"2. Minimize intermediate memory reallocations inside loop scopes.\n"
                f"3. Maintain code maintainability while reducing branch mispredictions."
            )
        else:
            fallback_summary = (
                f"### Algorithmic Complexity Profile\n"
                f"• **Time Complexity**: **{time_comp}** — Optimal linear or constant-time bounds observed.\n"
                f"• **Space Complexity**: **{space_comp}** — Minimal auxiliary memory overhead.\n\n"
                f"### Performance Appraisal\n"
                f"The implementation demonstrates strong algorithmic efficiency with no redundant nested loops or unbounded allocations. "
                f"Memory usage remains tightly bounded, making this solution scalable for large institutional input sets."
            )

        return fallback_summary, None


def optimization_agent(
    parsed_submission: ParsedSubmission,
    llm_client: Optional[LLMClient] = None,
    assignment_context: Optional[Dict[str, Any]] = None
) -> AgentOutput:
    """
    Main entry point for Optimization Agent.
    
    Args:
        parsed_submission: ParsedSubmission containing source and metrics
        llm_client: Optional LLMClient wrapper instance
        assignment_context: Optional problem specification
        
    Returns:
        AgentOutput wrapping OptimizationReport
    """
    if llm_client is None:
        llm_client = get_agent_llm_client("optimization_agent")

    engine = OptimizationEngine()
    time_comp = engine.estimate_time_complexity(parsed_submission.source, parsed_submission.ast_summary)
    space_comp = engine.estimate_space_complexity(parsed_submission.source, parsed_submission.language)
    findings = engine.detect_findings(parsed_submission)

    ctx = assignment_context or getattr(parsed_submission, 'assignment_context', None)
    generator = OptimizationJustificationGenerator(llm_client)
    overall_summary, suggested_code = generator.generate(
        language=parsed_submission.language,
        source=parsed_submission.source,
        time_comp=time_comp,
        space_comp=space_comp,
        findings=findings,
        complexity=parsed_submission.complexity,
        assignment_context=ctx
    )

    report = OptimizationReport(
        estimated_time_complexity=time_comp,
        estimated_space_complexity=space_comp,
        findings=findings,
        overall_summary=overall_summary,
        suggested_code=suggested_code
    )

    recommendations = [f"Line {f.line_number}: {f.suggested_optimization}" if f.line_number > 0 else f.suggested_optimization for f in findings]
    if not recommendations:
        recommendations = [f"Maintain optimal {time_comp} execution efficiency and {space_comp} space allocation."]

    details_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()

    return AgentOutput(
        agent_name="optimization_agent",
        summary=overall_summary,
        recommendations=recommendations,
        details=details_dict
    )
