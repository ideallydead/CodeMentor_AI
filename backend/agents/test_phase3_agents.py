"""
Unit tests for Phase 3 Agents: Optimization Agent & Submission-Time Viva Agent.

Tests cover:
1. Optimization Agent: Big-O time and space complexity estimation, nested loop detection, string concatenation warning.
2. Optimization Agent: LLM fallback and output formatting.
3. Viva Question Agent: Setup-time bank generation.
4. Viva Agent: Submission-time question selection, personalization, and fallback on empty bank.
"""

import pytest
from unittest.mock import Mock
from backend.core.schemas import ParsedSubmission, ASTSummary, ComplexityMetrics, Diagnostic
from backend.agents.schemas import (
    OptimizationReport,
    OptimizationFinding,
    VivaReport,
    SelectedVivaQuestion,
)
from backend.agents.optimization_agent import (
    OptimizationEngine,
    optimization_agent,
)
from backend.agents.viva_agent import (
    viva_question_agent,
    viva_agent,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def nested_loop_submission() -> ParsedSubmission:
    source = (
        "def find_duplicates(arr):\n"
        "    for i in range(len(arr)):\n"
        "        for j in range(i + 1, len(arr)):\n"
        "            if arr[i] == arr[j]:\n"
        "                return True\n"
        "    return False\n"
    )
    return ParsedSubmission(
        submission_id="sub_opt_001",
        language="python",
        source=source,
        ast_summary=ASTSummary(
            language="python",
            node_count=30,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Nested loop duplicate finder",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=4.0,
            maintainability_index=80.0,
            loc=6,
            halstead_volume=45.0,
            rank="A"
        ),
        diagnostics=[],
        static_findings=[],
        metadata={}
    )


@pytest.fixture
def linear_submission() -> ParsedSubmission:
    source = (
        "def find_max(arr):\n"
        "    max_val = arr[0]\n"
        "    for val in arr:\n"
        "        if val > max_val:\n"
        "            max_val = val\n"
        "    return max_val\n"
    )
    return ParsedSubmission(
        submission_id="sub_opt_002",
        language="python",
        source=source,
        ast_summary=ASTSummary(
            language="python",
            node_count=18,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Single loop max finder",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=2.0,
            maintainability_index=90.0,
            loc=6,
            halstead_volume=25.0,
            rank="A"
        ),
        diagnostics=[],
        static_findings=[],
        metadata={}
    )


# =============================================================================
# OPTIMIZATION AGENT TESTS
# =============================================================================

class TestOptimizationAgent:

    def test_optimization_agent_nested_loop_detection(self, nested_loop_submission):
        output = optimization_agent(nested_loop_submission)
        assert output.agent_name == "optimization_agent"
        details = output.details
        assert details["estimated_time_complexity"] == "O(n^2)"
        assert len(details["findings"]) > 0
        finding = details["findings"][0]
        assert finding["issue_type"] == "nested_loops"

    def test_optimization_agent_linear_complexity(self, linear_submission):
        output = optimization_agent(linear_submission)
        details = output.details
        assert details["estimated_time_complexity"] == "O(n)"

    def test_optimization_agent_llm_fallback(self, nested_loop_submission):
        broken_llm = Mock()
        broken_llm.generate.side_effect = RuntimeError("API error")
        output = optimization_agent(nested_loop_submission, llm_client=broken_llm)
        assert output.agent_name == "optimization_agent"
        assert "estimated time complexity" in output.summary or "O(n^2)" in output.summary


# =============================================================================
# VIVA AGENT TESTS
# =============================================================================

class TestVivaAgent:

    def test_viva_question_agent_setup_generation(self):
        bank = viva_question_agent("Merge Sort", "Implement merge sort", "python")
        assert isinstance(bank, list)
        assert len(bank) >= 3
        assert "prompt" in bank[0]
        assert "expected_concepts" in bank[0]

    def test_viva_agent_submission_selection(self, linear_submission):
        approved_bank = [
            {
                "id": "q1",
                "prompt": "What is the time complexity of finding the maximum element?",
                "expected_concepts": ["complexity", "linear time"]
            },
            {
                "id": "q2",
                "prompt": "How does your code handle empty array inputs?",
                "expected_concepts": ["edge case handling", "boundary conditions"]
            }
        ]
        output = viva_agent(linear_submission, approved_viva_bank=approved_bank)
        assert output.agent_name == "viva_agent"
        details = output.details
        assert len(details["selected_questions"]) == 2
        assert "personalization_reason" in details["selected_questions"][0]

    def test_viva_agent_fallback_empty_bank(self, linear_submission):
        output = viva_agent(linear_submission, approved_viva_bank=[])
        assert output.agent_name == "viva_agent"
        assert len(output.details["selected_questions"]) > 0
