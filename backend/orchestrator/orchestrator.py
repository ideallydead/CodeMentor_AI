import asyncio
import inspect
import logging
from typing import List, Optional, Dict, Any
from backend.core.schemas import ParsedSubmission, AgentOutput, SandboxResults
from backend.agents.assessment_agent import assessment_agent
from backend.agents.mentor_agent import mentor_agent
from backend.agents.optimization_agent import optimization_agent
from backend.agents.viva_agent import viva_agent
from backend.agents.integrity_agent import integrity_agent

logger = logging.getLogger(__name__)


async def _run_agent_safe(agent_name: str, agent_func, *args, **kwargs) -> AgentOutput:
    """
    Safely execute a single agent (async or sync) and catch any exceptions.
    """
    try:
        if inspect.iscoroutinefunction(agent_func):
            return await agent_func(*args, **kwargs)
        else:
            return await asyncio.to_thread(agent_func, *args, **kwargs)
    except Exception as exc:
        logger.error(f"Agent '{agent_name}' failed during pipeline execution: {exc}", exc_info=True)
        return AgentOutput(
            agent_name=agent_name,
            summary=f"Agent execution failed: {str(exc)}",
            recommendations=[],
            details={"status": "failed", "error": str(exc)}
        )


from backend.agents.schemas import AssessmentReport


async def run_assessment_pipeline(
    parsed_submission: ParsedSubmission,
    sandbox_results: Optional[SandboxResults] = None,
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None,
    historical_submissions: Optional[List[Dict[str, Any]]] = None
) -> List[AgentOutput]:
    """
    Execute submission-time agents. Assessment Agent runs first to produce scores,
    and then Mentor, Optimization, Viva, and Integrity agents run concurrently.
    
    Args:
        parsed_submission: Pre-computed submission analysis
        sandbox_results: Sandbox test execution results
        approved_viva_bank: Approved list of viva questions for the assignment
        historical_submissions: Prior submissions for structural integrity comparison
    
    Returns:
        List of AgentOutput from each agent in the pipeline
    """
    if sandbox_results is None:
        sandbox_results = SandboxResults(
            submission_id=parsed_submission.submission_id,
            language=parsed_submission.language,
            test_results=[]
        )

    # 1. Run Assessment Agent first to get deterministic scores & issue report
    assessment_output = await _run_agent_safe("assessment_agent", assessment_agent, parsed_submission, sandbox_results)

    assessment_report = None
    if assessment_output.details and assessment_output.details.get("status") != "failed":
        try:
            assessment_report = AssessmentReport(**assessment_output.details)
        except Exception:
            pass

    # 2. Run Mentor, Optimization, Viva, and Integrity agents concurrently
    other_outputs = await asyncio.gather(
        _run_agent_safe("mentor_agent", mentor_agent, parsed_submission, assessment_report=assessment_report),
        _run_agent_safe("optimization_agent", optimization_agent, parsed_submission),
        _run_agent_safe("viva_agent", viva_agent, parsed_submission, approved_viva_bank=approved_viva_bank),
        _run_agent_safe("integrity_agent", integrity_agent, parsed_submission, historical_submissions=historical_submissions),
    )

    return [assessment_output] + list(other_outputs)



