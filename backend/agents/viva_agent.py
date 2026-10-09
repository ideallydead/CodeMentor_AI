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
    Question-setup time agent: Generates a draft viva question bank (MCQs, Fill-in-the-blanks, Conceptual) for an assignment.
    
    Args:
        title: Assignment title
        description: Problem description and constraints
        language: Programming language (python, java, c)
        llm_client: Optional LLMClient instance
        
    Returns:
        List of draft viva questions with 'prompt', 'question_type', 'options', 'correct_answer', 'expected_concepts', and 'sample_answer'
    """
    client = llm_client or get_agent_llm_client("viva_agent")
    system_prompt = (
        "You are a computer science professor creating a viva examination question set for a programming assignment. "
        "Generate a balanced set of 3 to 5 viva questions containing multiple-choice questions (MCQs), fill-in-the-blank questions, and conceptual questions as a JSON array of objects.\n"
        "Each object must have:\n"
        "- 'prompt': The question statement (for fill-in-the-blanks, use '___' where the blank belongs)\n"
        "- 'question_type': 'mcq' | 'fill_in_the_blank' | 'conceptual'\n"
        "- 'options': list of 4 choices for mcqs (e.g. ['A) ...', 'B) ...', 'C) ...', 'D) ...']), empty list otherwise\n"
        "- 'correct_answer': the correct option or missing blank term (for mcq and fill_in_the_blank)\n"
        "- 'expected_concepts': list of key concepts being tested\n"
        "- 'sample_answer': brief reference answer or justification"
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

    # Fallback balanced question bank with MCQs, Fill-in-the-blank, and Conceptual questions
    t_lower = title.lower()
    is_search = any(k in t_lower for k in ["search", "binary"])
    is_hash = any(k in t_lower for k in ["hash", "map", "two sum"])

    mcq_correct = "B) O(log n)" if is_search else ("A) O(1) average" if is_hash else "C) O(n)")
    blank_prompt = (
        f"In {language}, '{title}' requires the data collection to be ___ before binary halving can occur."
        if is_search else
        f"To implement '{title}' efficiently in {language}, a ___ is commonly used to record previously seen states."
    )
    blank_correct = "sorted" if is_search else ("hash map" if language == "java" else ("dictionary" if language == "python" else "hash table"))

    return [
        {
            "prompt": f"What is the average time complexity of '{title}' in {language}?",
            "question_type": "mcq",
            "options": ["A) O(1) average", "B) O(log n)", "C) O(n)", "D) O(n^2)"],
            "correct_answer": mcq_correct,
            "expected_concepts": ["time complexity", "asymptotic efficiency", "algorithm design"],
            "sample_answer": f"Expected average time complexity for '{title}' is {mcq_correct}."
        },
        {
            "prompt": blank_prompt,
            "question_type": "fill_in_the_blank",
            "options": [],
            "correct_answer": blank_correct,
            "expected_concepts": ["data structure selection", "preconditions", "lookup efficiency"],
            "sample_answer": f"The key missing term is '{blank_correct}'."
        },
        {
            "prompt": f"Explain the edge cases and boundary conditions you considered when implementing '{title}'.",
            "question_type": "conceptual",
            "options": [],
            "correct_answer": "Empty array, single element, negative values, and out-of-bounds inputs.",
            "expected_concepts": ["edge case handling", "input validation", "boundary conditions"],
            "sample_answer": "Checked empty, single-element, or extreme inputs before main logic execution."
        },
        {
            "prompt": f"What is the auxiliary space complexity of an iterative implementation of '{title}'?",
            "question_type": "mcq",
            "options": ["A) O(1) auxiliary space", "B) O(log n) call-stack space", "C) O(n) heap memory", "D) O(n^2) space"],
            "correct_answer": "A) O(1) auxiliary space",
            "expected_concepts": ["space complexity", "auxiliary memory", "iterative execution"],
            "sample_answer": "The iterative approach operates in-place using O(1) auxiliary space."
        }
    ]


def evaluate_viva_answers(
    viva_answers: List[Dict[str, Any]],
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates student viva answers against expected concepts and reference solutions.
    Supports MCQs, Fill in the blanks, and Conceptual question types.
    """
    bank_map = {}
    if approved_viva_bank:
        for idx, item in enumerate(approved_viva_bank):
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

        # Look up reference question from bank by prompt or id
        bank_entry = bank_map.get(prompt.strip().lower()) or bank_map.get(str(ans.get("question_id", ""))) or {}
        q_type = ans.get("question_type") or bank_entry.get("question_type")
        if not q_type:
            if ans.get("options") or bank_entry.get("options"):
                q_type = "mcq"
            elif "___" in prompt or ("correct_answer" in ans and not ans.get("expected_concepts")):
                q_type = "fill_in_the_blank"
            else:
                q_type = "conceptual"

        options = ans.get("options") or bank_entry.get("options") or []
        correct_answer = ans.get("correct_answer") or bank_entry.get("correct_answer") or ""
        expected = ans.get("expected_concepts") or bank_entry.get("expected_concepts") or []
        sample_answer = ans.get("sample_answer") or bank_entry.get("sample_answer") or ""

        detected = []
        missing = []
        clean_student_ans = student_ans.lower()
        faculty_ver = ans.get("faculty_verification", "pending")

        # 1. Faculty override takes absolute precedence if explicitly provided
        if faculty_ver == "correct":
            score = 100
            assessment = "verified"
            detected = list(expected) or ["Verified by faculty"]
        elif faculty_ver == "partially_correct":
            score = 50
            assessment = "partially_verified"
            detected = ["Partially verified by faculty"]
        elif faculty_ver == "incorrect":
            score = 0
            assessment = "needs_expansion"
            missing = list(expected) or ["Marked incorrect by faculty"]
        else:
            # 2. Automated evaluation based on question type
            if not student_ans:
                score = 0
                missing = list(expected) if expected else ["No answer provided"]
                assessment = "needs_expansion"

            elif q_type == "mcq":
                clean_correct = correct_answer.strip().lower()
                correct_letter = clean_correct[0] if clean_correct and clean_correct[0] in "abcd" else ""
                student_letter = clean_student_ans[0] if clean_student_ans and clean_student_ans[0] in "abcd" else ""

                is_match = (
                    (clean_correct and clean_student_ans == clean_correct) or
                    (clean_correct and (clean_correct in clean_student_ans or clean_student_ans in clean_correct)) or
                    (bool(correct_letter) and correct_letter == student_letter)
                )

                if is_match:
                    score = 100
                    assessment = "verified"
                    detected = ["Correct MCQ Option Selected"]
                elif expected and any(c.lower() in clean_student_ans for c in expected):
                    matches = [c for c in expected if c.lower() in clean_student_ans]
                    score = round((len(matches) / len(expected)) * 100)
                    assessment = "verified" if score >= 70 else ("partially_verified" if score >= 40 else "needs_expansion")
                    detected = matches
                    missing = [c for c in expected if c not in matches]
                else:
                    score = 0
                    assessment = "needs_expansion"
                    missing = [f"Expected: {correct_answer}"]

            elif q_type in ("fill_in_the_blank", "fill_in_blank"):
                clean_correct = correct_answer.strip().lower()
                acceptable_answers = [a.strip().lower() for a in clean_correct.split(",") if a.strip()]
                if not acceptable_answers and sample_answer:
                    acceptable_answers = [sample_answer.strip().lower()]

                is_match = any(
                    acc == clean_student_ans or
                    acc in clean_student_ans or
                    clean_student_ans in acc
                    for acc in acceptable_answers
                )

                if is_match:
                    score = 100
                    assessment = "verified"
                    detected = ["Correct Blank Filled"]
                elif any(word in clean_student_ans for acc in acceptable_answers for word in acc.split() if len(word) > 3):
                    score = 50
                    assessment = "partially_verified"
                    detected = ["Partially Correct Term"]
                    missing = [f"Expected: {correct_answer}"]
                elif expected and any(c.lower() in clean_student_ans for c in expected):
                    matches = [c for c in expected if c.lower() in clean_student_ans]
                    score = round((len(matches) / len(expected)) * 100)
                    assessment = "verified" if score >= 70 else ("partially_verified" if score >= 40 else "needs_expansion")
                    detected = matches
                    missing = [c for c in expected if c not in matches]
                else:
                    score = 0
                    assessment = "needs_expansion"
                    missing = [f"Expected: {correct_answer}"]

            else:
                # Conceptual question evaluation using concept matching
                if not expected:
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
            "question_type": q_type,
            "options": options,
            "correct_answer": correct_answer,
            "student_answer": student_ans,
            "expected_concepts": expected,
            "sample_answer": sample_answer,
            "detected_concepts": detected,
            "missing_concepts": missing,
            "correctness_score": score,
            "ai_assessment": assessment,
            "faculty_verification": faculty_ver,
            "faculty_notes": ans.get("faculty_notes", "")
        }
        evaluated.append(eval_item)

    return evaluated


def viva_agent(
    parsed_submission: ParsedSubmission,
    approved_viva_bank: Optional[List[Dict[str, Any]]] = None,
    student_viva_answers: Optional[List[Dict[str, Any]]] = None,
    llm_client: Optional[LLMClient] = None,
    assignment_context: Optional[Dict[str, Any]] = None
) -> AgentOutput:
    """
    Submission-time agent: Selects and personalizes viva questions from the approved viva bank
    based on features of the student's submission, and evaluates any student viva answers provided.
    
    Args:
        parsed_submission: Pre-computed submission analysis
        approved_viva_bank: Approved list of viva questions for the assignment
        student_viva_answers: Optional student answers submitted with code
        llm_client: Optional LLMClient wrapper instance
        assignment_context: Optional problem specification
        
    Returns:
        AgentOutput wrapping VivaReport with selected viva questions, evaluated answers, and guidance
    """
    client = llm_client or get_agent_llm_client("viva_agent")
    bank = approved_viva_bank or []
    
    if not bank:
        bank = viva_question_agent("Submission Viva", "Default concept review", parsed_submission.language, llm_client=client)

    selected: List[SelectedVivaQuestion] = []
    has_high_cc = bool(parsed_submission.complexity.cyclomatic_complexity and parsed_submission.complexity.cyclomatic_complexity > 5)
    has_multiple_funcs = parsed_submission.ast_summary.function_count > 1
    ast_metadata = getattr(parsed_submission.ast_summary, "metadata", {}) or {}
    has_recursion = ast_metadata.get("has_recursion", False)

    # 1. Deterministic base selection from bank
    for idx, q in enumerate(bank, start=1):
        if not isinstance(q, dict):
            continue
        prompt = q.get('prompt', f'Question {idx}')
        concepts = q.get('expected_concepts', [])
        q_type = q.get('question_type', 'conceptual')
        options = q.get('options', [])
        correct_answer = q.get('correct_answer')
        sample_answer = q.get('sample_answer')
        
        reason = "Matched foundational algorithmic design principles"
        if has_high_cc and any('complexity' in c.lower() or 'performance' in c.lower() for c in concepts):
            reason = f"Probes cyclomatic complexity ({parsed_submission.complexity.cyclomatic_complexity}) and branching control flow"
            if q_type == 'conceptual':
                prompt = f"{prompt} (Focusing on branching decisions in your code)"
        elif has_recursion and any('recursion' in c.lower() or 'stack' in c.lower() or 'base' in c.lower() for c in concepts):
            reason = "Targeted inquiry regarding recursive base case termination and call-stack limits"
            if q_type == 'conceptual':
                prompt = f"{prompt} (Regarding your recursive function call structure)"
        elif has_multiple_funcs and any('algorithm' in c.lower() or 'design' in c.lower() for c in concepts):
            reason = f"Probes functional modularity across {parsed_submission.ast_summary.function_count} defined methods"
            if q_type == 'conceptual':
                prompt = f"{prompt} (Explaining how your helper functions pass state)"
        elif 'edge' in [c.lower() for c in concepts] or 'boundary' in [c.lower() for c in concepts]:
            reason = "Assesses boundary condition testing and edge-case handling awareness"

        selected.append(
            SelectedVivaQuestion(
                question_id=str(q.get('id', f'q_{idx}')),
                prompt=prompt,
                expected_concepts=concepts,
                personalization_reason=reason,
                question_type=q_type,
                options=options,
                correct_answer=correct_answer,
                sample_answer=sample_answer
            )
        )

    # Limit to top 3 questions
    selected = selected[:3]

    # 2. Generate enriched faculty viva evaluation guidance
    ctx = assignment_context or getattr(parsed_submission, 'assignment_context', None)
    assignment_title = ctx.get("title", "Assignment") if ctx else "Assignment"

    faculty_guidance = (
        f"### Viva Defense & Conceptual Evaluation Protocol for '{assignment_title}'\n"
        f"1. **Conceptual Verification**: Review the student's MCQ choices, fill-in-the-blank responses, and algorithmic justifications.\n"
        f"2. **Selected Questions**: Verify answers across the {len(selected)} assigned viva questions, checking for understanding of time/space complexity and state handling.\n"
        f"3. **Integrity Probe**: Confirm firsthand authorship by verifying explanations of edge cases and algorithmic trade-offs."
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
        summary = f"Selected {len(selected)} personalized viva questions; evaluated {len(evaluated_answers)} student viva answers (readiness score: {avg_viva_score}%)"
    else:
        summary = f"Selected {len(selected)} personalized viva questions (MCQs, fill-in-the-blanks & conceptual) tailored to submission AST metrics"

    return AgentOutput(
        agent_name='viva_agent',
        summary=summary,
        recommendations=[q.prompt for q in selected],
        details=details_dict
    )

