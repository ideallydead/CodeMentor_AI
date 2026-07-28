"""
Unit tests for concurrent assessment orchestrator.

Verifies:
1. All 5 submission-time agents (Assessment, Mentor, Optimization, Viva, Integrity) run concurrently.
2. TestCase agent is excluded from submission-time pipeline (runs during Question Setup).
3. Per-agent error handling: if one agent fails/raises an exception, all 5 outputs are still present,
   showing failure status for the broken agent while remaining agents complete cleanly.
"""

import pytest
import asyncio
from unittest.mock import patch

from backend.core.schemas import (
    ParsedSubmission,
    ASTSummary,
    ComplexityMetrics,
    SandboxResults,
)
from backend.orchestrator.orchestrator import run_assessment_pipeline


@pytest.fixture
def sample_parsed_submission() -> ParsedSubmission:
    return ParsedSubmission(
        submission_id="sub_test_123",
        language="python",
        source="def add(a, b):\n    return a + b\n",
        ast_summary=ASTSummary(
            language="python",
            node_count=10,
            function_count=1,
            class_count=0,
            imports=[],
            summary="Sample AST",
            metadata={}
        ),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=1.0,
            maintainability_index=90.0,
            loc=2,
            halstead_volume=10.0,
            rank="A"
        ),
        diagnostics=[],
        static_findings=[],
        metadata={}
    )


@pytest.fixture
def sample_sandbox_results() -> SandboxResults:
    return SandboxResults(
        submission_id="sub_test_123",
        language="python",
        test_results=[]
    )


def test_run_assessment_pipeline_all_succeed(sample_parsed_submission, sample_sandbox_results):
    """Confirm all 5 submission-time agents execute concurrently and return outputs."""
    outputs = asyncio.run(run_assessment_pipeline(sample_parsed_submission, sample_sandbox_results))
    
    assert len(outputs) == 5
    agent_names = [out.agent_name for out in outputs]
    assert "assessment_agent" in agent_names
    assert "mentor_agent" in agent_names
    assert "optimization_agent" in agent_names
    assert "viva_agent" in agent_names
    assert "integrity_agent" in agent_names
    
    # Confirm TestCase agent is NOT in submission-time pipeline
    assert "testcase_agent" not in agent_names


def test_run_assessment_pipeline_one_agent_fails(sample_parsed_submission, sample_sandbox_results):
    """Confirm all five agents' outputs are present even when one is mocked to raise an exception."""
    with patch("backend.orchestrator.orchestrator.mentor_agent", side_effect=RuntimeError("LLM service unavailable")):
        outputs = asyncio.run(run_assessment_pipeline(sample_parsed_submission, sample_sandbox_results))
        
        assert len(outputs) == 5
        agent_names = [out.agent_name for out in outputs]
        assert "assessment_agent" in agent_names
        assert "mentor_agent" in agent_names
        assert "optimization_agent" in agent_names
        assert "viva_agent" in agent_names
        assert "integrity_agent" in agent_names
        
        # Mentor agent output should reflect failure
        mentor_output = next(out for out in outputs if out.agent_name == "mentor_agent")
        assert "failed" in mentor_output.summary.lower() or "error" in mentor_output.summary.lower()
        assert mentor_output.details.get("status") == "failed"
        assert "LLM service unavailable" in mentor_output.details.get("error", "")
        
        # The remaining 4 agents should have succeeded without error
        assessment_output = next(out for out in outputs if out.agent_name == "assessment_agent")
        assert assessment_output.details.get("status") != "failed"
        
        opt_output = next(out for out in outputs if out.agent_name == "optimization_agent")
        assert opt_output.details.get("status") != "failed"
        
        viva_output = next(out for out in outputs if out.agent_name == "viva_agent")
        assert viva_output.details.get("status") != "failed"

        integrity_output = next(out for out in outputs if out.agent_name == "integrity_agent")
        assert integrity_output.details.get("status") != "failed"


def test_run_assessment_pipeline_multiple_agent_failures(sample_parsed_submission, sample_sandbox_results):
    """Confirm pipeline resilience when multiple agents fail."""
    with patch("backend.orchestrator.orchestrator.assessment_agent", side_effect=ValueError("Assessment parsing error")), \
         patch("backend.orchestrator.orchestrator.viva_agent", side_effect=KeyError("Missing viva metadata")):
        
        outputs = asyncio.run(run_assessment_pipeline(sample_parsed_submission, sample_sandbox_results))
        
        assert len(outputs) == 5
        
        assessment_out = next(out for out in outputs if out.agent_name == "assessment_agent")
        assert assessment_out.details.get("status") == "failed"
        assert "Assessment parsing error" in assessment_out.details.get("error", "")
        
        viva_out = next(out for out in outputs if out.agent_name == "viva_agent")
        assert viva_out.details.get("status") == "failed"
        assert "Missing viva metadata" in viva_out.details.get("error", "")
        
        # Mentor, Optimization, and Integrity should still succeed
        mentor_out = next(out for out in outputs if out.agent_name == "mentor_agent")
        assert mentor_out.details.get("status") != "failed"
        
        opt_out = next(out for out in outputs if out.agent_name == "optimization_agent")
        assert opt_out.details.get("status") != "failed"

        integrity_out = next(out for out in outputs if out.agent_name == "integrity_agent")
        assert integrity_out.details.get("status") != "failed"


def test_run_assessment_pipeline_default_sandbox_results(sample_parsed_submission):
    """Confirm orchestrator handles missing sandbox_results parameter by defaulting."""
    outputs = asyncio.run(run_assessment_pipeline(sample_parsed_submission, sandbox_results=None))
    assert len(outputs) == 5
