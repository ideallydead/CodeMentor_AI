"""
Viva Agent: Provides question-setup time draft question generation and submission-time
personalized viva question selection from approved question banks.

ROLES:
1. viva_question_agent: Question-setup time (generates draft viva question bank for faculty review).
2. viva_agent: Submission-time (selects and personalizes questions from the approved bank for student evaluation).
"""

import logging
from typing import List, Dict, Any, Optional

from backend.core.schemas import ParsedSubmission, AgentOutput
from backend.core.llm_client import LLMClient
from backend.agents.schemas import SelectedVivaQuestion, VivaReport

logger = logging.getLogger(__name__)


def viva_question_agent(
    title: str,
    description: str,
    language: str,
    llm_client: Optional[LLMClient] = None
) -> List[Dict[str, Any]]:
    """
    Question-setup time agent: Generates a draft viva question bank for an assignment.
    
    Args:
        title: Assignment title
        description: Problem description and constraints
        language: Programming language (python, java, c)
        llm_client: Optional LLMClient instance
        
    Returns:
        List of draft viva questions with 'prompt', 'expected_concepts', and 'sample_answer'
    """
    client = llm_client or LLMClient()
    system_prompt = (
        "You are a computer science professor creating oral viva examination questions for a programming assignment. "
        "Generate 3 to 5 conceptual viva questions as a JSON array of objects with keys: 'prompt', 'expected_concepts', and 'sample_answer'."
    )
    user_prompt = f"Title: {title}\nLanguage: {language}\nDescription:\n{description}"

    try:
        if hasattr(client, "generate"):
            llm_res = client.generate(prompt=user_prompt, system_prompt=system_prompt, json_mode=True)
            if isinstance(llm_res, dict) and not llm_res.get('is_fallback') and 'parsed' in llm_res and isinstance(llm_res['parsed'], list):
                return llm_res['parsed']
    except Exception as exc:
        logger.error(f"LLM draft viva bank generation failed: {exc}")

    return [
        {
            "prompt": f"Explain the core algorithm and data structures you used to solve '{title}' in {language}.",
            "expected_concepts": ["algorithm design", "data structures", "time complexity"],
            "sample_answer": f"The solution uses an iterative or recursive approach to process inputs for {title} efficiently."
        },
        {
            "prompt": f"What edge cases did you consider in your {language} implementation?",
            "expected_concepts": ["edge case handling", "input validation", "boundary conditions"],
            "sample_answer": "Checked zero, negative, or maximum bounds before main logic execution."
        },
        {
            "prompt": "How would your code perform if the input size increased by 1,000x?",
            "expected_concepts": ["scalability", "big-O complexity", "memory footprint"],
            "sample_answer": "Analyzed time and space complexity growth constraints."
        }
    ]


def viva_agent(
    parsed_submission: ParsedSubmission,
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None
) -> AgentOutput:
    """
    Submission-time agent: Selects and personalizes viva questions from the approved viva bank
    based on features of the student's submission.
    
    Args:
        parsed_submission: Pre-computed submission analysis
        approved_viva_bank: Approved list of viva questions for the assignment
        
    Returns:
        AgentOutput wrapping VivaReport with selected viva questions and guidance
    """
    bank = approved_viva_bank or []
    
    if not bank:
        bank = viva_question_agent("Submission Viva", "Default concept review", parsed_submission.language)

    selected: List[SelectedVivaQuestion] = []
    has_high_cc = bool(parsed_submission.complexity.cyclomatic_complexity and parsed_submission.complexity.cyclomatic_complexity > 5)
    has_multiple_funcs = parsed_submission.ast_summary.function_count > 1

    for idx, q in enumerate(bank, start=1):
        if not isinstance(q, dict):
            continue
        prompt = q.get('prompt', f'Question {idx}')
        concepts = q.get('expected_concepts', [])
        
        # Tailor prompt to student AST specifics
        reason = "Matched general algorithmic concepts"
        if has_high_cc and any('complexity' in c.lower() or 'performance' in c.lower() for c in concepts):
            reason = f"Selected because student solution has cyclomatic complexity of {parsed_submission.complexity.cyclomatic_complexity}"
            prompt = f"{prompt} (Specifically regarding your code's cyclomatic complexity)"
        elif has_multiple_funcs and any('algorithm' in c.lower() or 'design' in c.lower() for c in concepts):
            reason = f"Selected because student solution uses {parsed_submission.ast_summary.function_count} modular functions"
            prompt = f"{prompt} (Regarding your function decomposition across {parsed_submission.ast_summary.function_count} methods)"
        elif 'edge' in [c.lower() for c in concepts] or 'boundary' in [c.lower() for c in concepts]:
            reason = "Selected to test boundary condition and edge case awareness"

        selected.append(
            SelectedVivaQuestion(
                question_id=str(q.get('id', f'q_{idx}')),
                prompt=prompt,
                expected_concepts=concepts,
                personalization_reason=reason
            )
        )

    # Limit to top 3 questions
    selected = selected[:3]

    faculty_guidance = (
        f"Ask the student to answer 2 of the {len(selected)} selected viva questions during oral defense. "
        "Focus on evaluating whether the student understands their own code structure rather than memorized code."
    )

    report = VivaReport(
        selected_questions=selected,
        guidance_for_faculty=faculty_guidance
    )

    details_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()

    return AgentOutput(
        agent_name='viva_agent',
        summary=f'Selected {len(selected)} personalized viva questions from approved bank',
        recommendations=[q.prompt for q in selected],
        details=details_dict
    )
