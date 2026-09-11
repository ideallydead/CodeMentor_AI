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
from backend.core.llm_client import LLMClient, get_agent_llm_client
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
    client = llm_client or get_agent_llm_client("viva_agent")
    system_prompt = (
        "You are a computer science professor creating oral viva examination questions for a programming assignment. "
        "Generate 3 to 5 conceptual viva questions as a JSON array of objects with keys: 'prompt', 'expected_concepts', and 'sample_answer'."
    )
    user_prompt = f"Title: {title}\nLanguage: {language}\nDescription:\n{description}"

    try:
        if hasattr(client, "generate"):
            llm_res = client.generate(prompt=user_prompt, system_prompt=system_prompt, json_mode=True)
            if isinstance(llm_res, dict) and 'parsed' in llm_res and llm_res['parsed']:
                parsed = llm_res['parsed']
                if isinstance(parsed, list) and len(parsed) > 0:
                    return parsed
                elif isinstance(parsed, dict):
                    for k in ['viva_questions', 'questions', 'items', 'bank']:
                        if k in parsed and isinstance(parsed[k], list) and len(parsed[k]) > 0:
                            return parsed[k]
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


def evaluate_viva_answers(
    viva_answers: List[Dict[str, Any]],
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates student viva answers against expected concepts and reference solutions.
    For each answer, computes:
    - detected_concepts: list of concepts identified in student explanation
    - missing_concepts: list of concepts omitted
    - correctness_score: 0-100 percentage score based on concept articulation
    - ai_assessment: 'verified' (>=70%), 'partially_verified' (40-69%), 'needs_expansion' (<40%)
    - faculty_verification: preserve existing or default to 'pending'
    """
    bank_map = {}
    if approved_viva_bank:
        for item in approved_viva_bank:
            if isinstance(item, dict):
                key = item.get("prompt", "").strip().lower()
                if key:
                    bank_map[key] = item
                if "id" in item:
                    bank_map[str(item["id"])] = item

    evaluated = []
    for idx, ans in enumerate(viva_answers):
        if not isinstance(ans, dict):
            continue

        prompt = ans.get("prompt") or ans.get("question") or f"Viva Question {idx + 1}"
        student_ans = (ans.get("student_answer") or ans.get("answer") or "").strip()

        # Look up reference question from bank if missing expected_concepts
        bank_entry = bank_map.get(prompt.strip().lower(), {})
        expected = ans.get("expected_concepts") or bank_entry.get("expected_concepts") or []
        sample_answer = ans.get("sample_answer") or bank_entry.get("sample_answer") or ""

        detected = []
        missing = []
        clean_student_ans = student_ans.lower()

        if not student_ans:
            score = 0
            missing = list(expected)
            assessment = "needs_expansion"
        elif not expected:
            word_count = len(student_ans.split())
            score = 85 if word_count >= 15 else (60 if word_count >= 5 else 30)
            assessment = "verified" if score >= 70 else ("partially_verified" if score >= 40 else "needs_expansion")
        else:
            for concept in expected:
                c_clean = str(concept).strip().lower()
                words = [w for w in c_clean.replace("-", " ").replace("_", " ").split() if len(w) > 2]
                if c_clean in clean_student_ans:
                    detected.append(concept)
                elif words and any(w in clean_student_ans for w in words):
                    detected.append(concept)
                else:
                    missing.append(concept)

            coverage = len(detected) / len(expected)
            score = round(coverage * 100)
            assessment = "verified" if score >= 70 else ("partially_verified" if score >= 40 else "needs_expansion")

        eval_item = {
            "question_id": str(ans.get("question_id") or f"q_{idx + 1}"),
            "prompt": prompt,
            "student_answer": student_ans,
            "expected_concepts": expected,
            "sample_answer": sample_answer,
            "detected_concepts": detected,
            "missing_concepts": missing,
            "correctness_score": score,
            "ai_assessment": assessment,
            "faculty_verification": ans.get("faculty_verification", "pending"),
            "faculty_notes": ans.get("faculty_notes", "")
        }
        evaluated.append(eval_item)

    return evaluated


def viva_agent(
    parsed_submission: ParsedSubmission,
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None,
    student_viva_answers: Optional[List[Dict[str, Any]]] = None
) -> AgentOutput:
    """
    Submission-time agent: Selects and personalizes viva questions from the approved viva bank
    based on features of the student's submission, and evaluates any student viva answers provided.
    
    Args:
        parsed_submission: Pre-computed submission analysis
        approved_viva_bank: Approved list of viva questions for the assignment
        student_viva_answers: Optional student verbal/written answers submitted with code
        
    Returns:
        AgentOutput wrapping VivaReport with selected viva questions, evaluated answers, and guidance
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

    evaluated_answers = []
    avg_viva_score = None
    if student_viva_answers:
        evaluated_answers = evaluate_viva_answers(student_viva_answers, bank)
        scores = [ea["correctness_score"] for ea in evaluated_answers]
        avg_viva_score = round(sum(scores) / len(scores)) if scores else None
        details_dict["evaluated_answers"] = evaluated_answers
        details_dict["avg_viva_score"] = avg_viva_score
        summary = f"Selected {len(selected)} viva questions; evaluated {len(evaluated_answers)} student viva answers (readiness score: {avg_viva_score}%)"
    else:
        summary = f"Selected {len(selected)} personalized viva questions from approved bank"

    return AgentOutput(
        agent_name='viva_agent',
        summary=summary,
        recommendations=[q.prompt for q in selected],
        details=details_dict
    )

