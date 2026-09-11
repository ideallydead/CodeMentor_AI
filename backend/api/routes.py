from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db import models
from backend.api import schemas
from backend.core.schemas import ParsedSubmission, AgentOutput
from backend.orchestrator.orchestrator import run_assessment_pipeline
from backend.adapters import python_adapter, java_adapter, c_adapter
from backend.agents.testcase_agent import testcase_agent
from backend.agents.viva_agent import viva_question_agent, evaluate_viva_answers
from backend.sandbox.test_suite_runner import run_test_suite_against_code

router = APIRouter(prefix='/api')


@router.get('/questions', response_model=List[schemas.QuestionResponse])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(models.Assignment).order_by(models.Assignment.id.desc()).all()
    return questions


@router.get('/questions/{question_id}', response_model=schemas.QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(models.Assignment, question_id)
    if not question:
        raise HTTPException(status_code=404, detail='Question not found')
    return question


@router.post('/questions', response_model=schemas.QuestionResponse)
def create_question(payload: schemas.QuestionCreate, db: Session = Depends(get_db)):
    question = models.Assignment(
        title=payload.title,
        description=payload.description,
        language=payload.language,
        is_approved=False,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    # Question setup flow: invoke TestCase Agent and Viva Question Agent
    question.draft_tests = testcase_agent(payload.title, payload.description or '', payload.language)
    question.draft_viva = viva_question_agent(payload.title, payload.description or '', payload.language)

    db.add(question)
    db.commit()
    db.refresh(question)

    return question


@router.put('/questions/{question_id}', response_model=schemas.QuestionResponse)
def update_question(question_id: int, payload: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    question = db.get(models.Assignment, question_id)
    if not question:
        raise HTTPException(status_code=404, detail='Question not found')
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.post('/questions/{question_id}/approve', response_model=schemas.QuestionResponse)
def approve_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(models.Assignment, question_id)
    if not question:
        raise HTTPException(status_code=404, detail='Question not found')
    question.is_approved = True

    # Persist draft test cases into TestCase DB models if not already created
    existing_tcs = db.query(models.TestCase).filter(models.TestCase.assignment_id == question.id).count()
    if existing_tcs == 0 and question.draft_tests:
        for dt in question.draft_tests:
            tc_model = models.TestCase(
                assignment_id=question.id,
                input_data=dt.get('input', dt.get('input_data', '')),
                expected_output=dt.get('expected_output', ''),
                active=True
            )
            db.add(tc_model)

    # Persist draft viva into VivaQuestion DB models if not already created
    existing_vqs = db.query(models.VivaQuestion).filter(models.VivaQuestion.assignment_id == question.id).count()
    if existing_vqs == 0 and question.draft_viva:
        for dv in question.draft_viva:
            vq_model = models.VivaQuestion(
                assignment_id=question.id,
                prompt=dv.get('prompt', ''),
                expected_concepts=dv.get('expected_concepts', [])
            )
            db.add(vq_model)

    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.post('/run-code', response_model=schemas.RunCodeResponse)
def run_code_sandbox(payload: schemas.RunCodeRequest, db: Session = Depends(get_db)):
    assignment = db.get(models.Assignment, payload.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail='Assignment not found')

    db_test_cases = db.query(models.TestCase).filter(
        models.TestCase.assignment_id == payload.assignment_id,
        models.TestCase.active.is_(True)
    ).all()
    
    test_cases_to_run = db_test_cases if db_test_cases else (assignment.draft_tests or [])
    # Run against first sample tests for fast feedback
    sample_tests = test_cases_to_run[:4] if test_cases_to_run else []

    sandbox_results = run_test_suite_against_code(
        submission_id=f"run_{payload.assignment_id}",
        source=payload.source_code,
        language=payload.language,
        test_cases=sample_tests
    )

    result_items = [
        schemas.SandboxTestResultItem(
            test_id=tr.test_id,
            passed=tr.passed,
            actual_output=tr.actual_output,
            execution_time_ms=tr.execution_time_ms,
            error_message=tr.error_message,
            input_data=tr.input_data,
            expected_output=tr.expected_output,
            failure_reason=tr.failure_reason
        )
        for tr in sandbox_results.test_results
    ]

    status = "completed"
    if sandbox_results.compilation_error:
        status = "compile_error"
    elif sandbox_results.timeout_error:
        status = "timeout"

    total_tests = len(result_items)
    passed_tests = sum(1 for r in result_items if r.passed)

    return schemas.RunCodeResponse(
        status=status,
        compilation_error=sandbox_results.compilation_error,
        timeout_error=sandbox_results.timeout_error,
        total_tests=total_tests,
        passed_tests=passed_tests,
        test_results=result_items
    )


@router.post('/submissions', response_model=schemas.SubmissionResponse)
async def submit_code(payload: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    assignment = db.get(models.Assignment, payload.assignment_id)
    if not assignment or not assignment.is_approved:
        raise HTTPException(status_code=400, detail='Assignment is not approved for submissions')

    # Ensure student user exists to prevent foreign key constraint violation
    student_user = db.get(models.User, payload.student_id)
    if not student_user:
        student_user = models.User(
            id=payload.student_id,
            email=f"student{payload.student_id}@codementor.edu",
            hashed_password="hashed_password_placeholder",
            role="student"
        )
        db.add(student_user)
        db.commit()

    approved_viva_bank = assignment.draft_viva or []
    evaluated_viva = []
    initial_viva_score = None
    if payload.viva_answers:
        evaluated_viva = evaluate_viva_answers(payload.viva_answers, approved_viva_bank)
        scores = [v.get("correctness_score", 0) for v in evaluated_viva if v.get("correctness_score") is not None]
        if scores:
            initial_viva_score = round(sum(scores) / len(scores))

    submission = models.Submission(
        assignment_id=payload.assignment_id,
        student_id=payload.student_id,
        source_code=payload.source_code,
        language=payload.language,
        status='queued',
        viva_answers=evaluated_viva,
        viva_score=initial_viva_score,
        viva_verified=False
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    parsed = parse_submission(payload.language, payload.source_code)

    # 1. Fetch DB test cases for assignment (or fallback to draft_tests)
    db_test_cases = db.query(models.TestCase).filter(
        models.TestCase.assignment_id == payload.assignment_id,
        models.TestCase.active.is_(True)
    ).all()
    test_cases_to_run = db_test_cases if db_test_cases else (assignment.draft_tests or [])

    # 2. Execute student code against test suite inside isolated sandbox
    sandbox_results = run_test_suite_against_code(
        submission_id=str(submission.id),
        source=payload.source_code,
        language=payload.language,
        test_cases=test_cases_to_run
    )
    
    # 3. Query prior submissions for academic integrity AST comparison
    prior_subs = db.query(models.Submission).filter(
        models.Submission.assignment_id == payload.assignment_id,
        models.Submission.id != submission.id
    ).all()

    prior_same_student = [s for s in prior_subs if s.student_id == payload.student_id]
    is_resubmission = len(prior_same_student) > 0
    attempt_number = len(prior_same_student) + 1

    if is_resubmission:
        # Per requirement: For multiple submissions from the same student, no need for performing similarity checks on the resubmitted code
        historical_submissions = []
    else:
        # Never compare student's code against themselves
        historical_submissions = [
            {"id": s.id, "student_id": s.student_id, "source_code": s.source_code, "language": s.language}
            for s in prior_subs if s.student_id != payload.student_id
        ]

    aggregated_report = await run_assessment_pipeline(
        parsed,
        sandbox_results=sandbox_results,
        approved_viva_bank=approved_viva_bank,
        historical_submissions=historical_submissions,
        student_viva_answers=payload.viva_answers
    )

    if is_resubmission:
        for ag in aggregated_report:
            if ag.agent_name == "integrity_agent":
                ag.summary = f"Resubmission (Attempt #{attempt_number}): Academic integrity similarity check bypassed for student re-attempt."
                ag.details["risk_level"] = "low"
                ag.details["max_similarity_score"] = 0.0
                ag.details["matches"] = []
                ag.details["explainable_summary"] = f"Resubmission (Attempt #{attempt_number}): Academic integrity similarity check bypassed for student re-attempt."

    report = models.Report(
        submission_id=submission.id,
        aggregated_output={'agents': [agent.dict() for agent in aggregated_report]}
    )
    db.add(report)
    submission.status = 'completed'
    db.add(submission)
    db.commit()
    db.refresh(submission)
    db.refresh(report)

    return submission


@router.get('/submissions/{submission_id}/status', response_model=schemas.SubmissionStatusResponse)
def submission_status(submission_id: int, db: Session = Depends(get_db)):
    submission = db.get(models.Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail='Submission not found')
    details = {}
    if submission.report:
        details = submission.report.aggregated_output
    return schemas.SubmissionStatusResponse(id=submission.id, status=submission.status, details=details)


@router.get('/reports/{report_id}', response_model=schemas.ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.get(models.Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    return report


from backend.agents.faculty_intelligence import generate_faculty_intelligence


@router.get('/questions/{question_id}/intelligence', response_model=schemas.FacultyIntelligenceResponse)
def get_faculty_intelligence(question_id: int, db: Session = Depends(get_db)):
    intel = generate_faculty_intelligence(question_id, db)
    if "error" in intel:
        raise HTTPException(status_code=404, detail=intel["error"])
    return intel


@router.post('/submissions/{submission_id}/viva', response_model=schemas.SubmissionResponse)
def update_submission_viva(submission_id: int, payload: schemas.SubmissionVivaUpdateRequest, db: Session = Depends(get_db)):
    submission = db.get(models.Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail='Submission not found')

    assignment = submission.assignment
    approved_bank = assignment.draft_viva or [] if assignment else []
    evaluated_viva = evaluate_viva_answers(payload.viva_answers, approved_bank)
    scores = [v.get("correctness_score", 0) for v in evaluated_viva if v.get("correctness_score") is not None]

    submission.viva_answers = evaluated_viva
    if scores:
        submission.viva_score = round(sum(scores) / len(scores))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.post('/submissions/{submission_id}/override', response_model=schemas.SubmissionResponse)
def override_submission_grade(submission_id: int, payload: schemas.FacultyOverrideRequest, db: Session = Depends(get_db)):
    submission = db.get(models.Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail='Submission not found')

    if payload.faculty_score is not None:
        submission.faculty_score = payload.faculty_score
    if payload.final_grade is not None:
        submission.final_grade = payload.final_grade
    if payload.faculty_notes is not None:
        submission.faculty_notes = payload.faculty_notes
    if payload.viva_verified is not None:
        submission.viva_verified = payload.viva_verified
    if payload.viva_score is not None:
        submission.viva_score = payload.viva_score
    if payload.viva_feedback is not None:
        submission.viva_feedback = payload.viva_feedback
    if payload.viva_answers is not None:
        submission.viva_answers = payload.viva_answers

    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get('/analytics', response_model=schemas.AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    total_assignments = db.query(models.Assignment).count()
    total_submissions = db.query(models.Submission).count()
    approved_assignments = db.query(models.Assignment).filter(models.Assignment.is_approved.is_(True)).count()
    pending_submissions = db.query(models.Submission).filter(models.Submission.final_grade.is_(None)).count()

    return schemas.AnalyticsResponse(
        assignments_total=total_assignments,
        submissions_total=total_submissions,
        approved_assignments=approved_assignments,
        pending_submissions=pending_submissions,
    )


@router.get('/assignments/{assignment_id}/submissions/latest', response_model=Optional[schemas.LatestSubmissionResponse])
def get_latest_student_submission(assignment_id: int, student_id: int, db: Session = Depends(get_db)):
    """Fetch the most recent code submission for a specific student and assignment."""
    latest = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == student_id
    ).order_by(models.Submission.id.desc()).first()

    if not latest:
        return None

    return schemas.LatestSubmissionResponse(
        id=latest.id,
        assignment_id=latest.assignment_id,
        student_id=latest.student_id,
        source_code=latest.source_code or '',
        language=latest.language,
        created_at=latest.created_at.isoformat() if latest.created_at else None
    )


@router.delete('/questions/{question_id}')
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.get(models.Assignment, question_id)
    if not question:
        raise HTTPException(status_code=404, detail='Question not found')

    subs = db.query(models.Submission).filter(models.Submission.assignment_id == question_id).all()
    sub_ids = [s.id for s in subs]
    if sub_ids:
        db.query(models.Report).filter(models.Report.submission_id.in_(sub_ids)).delete(synchronize_session=False)
        db.query(models.Submission).filter(models.Submission.assignment_id == question_id).delete(synchronize_session=False)

    db.query(models.TestCase).filter(models.TestCase.assignment_id == question_id).delete(synchronize_session=False)
    db.query(models.VivaQuestion).filter(models.VivaQuestion.assignment_id == question_id).delete(synchronize_session=False)
    db.delete(question)
    db.commit()

    # If no assignments remain, reset ID sequences so new assignments start at ID 1
    remaining_count = db.query(models.Assignment).count()
    if remaining_count == 0:
        dialect = db.get_bind().dialect.name
        try:
            if dialect == 'postgresql':
                db.execute(text("ALTER SEQUENCE assignments_id_seq RESTART WITH 1;"))
                db.execute(text("ALTER SEQUENCE test_cases_id_seq RESTART WITH 1;"))
                db.execute(text("ALTER SEQUENCE submissions_id_seq RESTART WITH 1;"))
                db.execute(text("ALTER SEQUENCE reports_id_seq RESTART WITH 1;"))
                db.execute(text("ALTER SEQUENCE viva_questions_id_seq RESTART WITH 1;"))
                db.commit()
            elif dialect == 'sqlite':
                db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('reports', 'submissions', 'viva_questions', 'test_cases', 'assignments');"))
                db.commit()
        except Exception:
            db.rollback()

    return {'message': f'Assignment #{question_id} and associated records deleted successfully'}


@router.delete('/submissions/{submission_id}')
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    sub = db.get(models.Submission, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail='Submission not found')
    db.query(models.Report).filter(models.Report.submission_id == submission_id).delete(synchronize_session=False)
    db.delete(sub)
    db.commit()
    return {'message': f'Submission #{submission_id} and associated report deleted successfully'}


@router.post('/reset-data')
def reset_all_data(db: Session = Depends(get_db)):
    dialect = db.get_bind().dialect.name
    try:
        if dialect == 'postgresql':
            db.execute(text("TRUNCATE TABLE reports, submissions, viva_questions, test_cases, assignments RESTART IDENTITY CASCADE;"))
            db.commit()
        elif dialect == 'sqlite':
            db.query(models.Report).delete(synchronize_session=False)
            db.query(models.Submission).delete(synchronize_session=False)
            db.query(models.VivaQuestion).delete(synchronize_session=False)
            db.query(models.TestCase).delete(synchronize_session=False)
            db.query(models.Assignment).delete(synchronize_session=False)
            db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('reports', 'submissions', 'viva_questions', 'test_cases', 'assignments');"))
            db.commit()
        else:
            db.query(models.Report).delete(synchronize_session=False)
            db.query(models.Submission).delete(synchronize_session=False)
            db.query(models.VivaQuestion).delete(synchronize_session=False)
            db.query(models.TestCase).delete(synchronize_session=False)
            db.query(models.Assignment).delete(synchronize_session=False)
            db.commit()
    except Exception:
        db.rollback()
        # Fallback delete
        db.query(models.Report).delete(synchronize_session=False)
        db.query(models.Submission).delete(synchronize_session=False)
        db.query(models.VivaQuestion).delete(synchronize_session=False)
        db.query(models.TestCase).delete(synchronize_session=False)
        db.query(models.Assignment).delete(synchronize_session=False)
        db.commit()

    return {'message': 'All assignments, test cases, viva questions, submissions, and reports have been reset successfully'}



def parse_submission(language: str, source: str) -> ParsedSubmission:
    if language.lower() == 'python':
        return python_adapter.parse_source(source)
    if language.lower() == 'java':
        return java_adapter.parse_source(source)
    if language.lower() == 'c':
        return c_adapter.parse_source(source)
    raise HTTPException(status_code=400, detail='Unsupported language')
