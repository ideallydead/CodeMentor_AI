from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db import models
from backend.api import schemas
from backend.core.schemas import ParsedSubmission, AgentOutput
from backend.orchestrator.orchestrator import run_assessment_pipeline
from backend.adapters import python_adapter, java_adapter, c_adapter
from backend.agents.testcase_agent import testcase_agent
from backend.agents.viva_agent import viva_question_agent
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

    db.add(question)
    db.commit()
    db.refresh(question)
    return question


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

    submission = models.Submission(
        assignment_id=payload.assignment_id,
        student_id=payload.student_id,
        source_code=payload.source_code,
        language=payload.language,
        status='queued',
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    parsed = parse_submission(payload.language, payload.source_code)
    approved_viva_bank = assignment.draft_viva or []

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
    historical_submissions = [
        {"id": s.id, "student_id": s.student_id, "source_code": s.source_code, "language": s.language}
        for s in prior_subs
    ]

    aggregated_report = await run_assessment_pipeline(
        parsed,
        sandbox_results=sandbox_results,
        approved_viva_bank=approved_viva_bank,
        historical_submissions=historical_submissions
    )

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

    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get('/analytics', response_model=schemas.AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    total_assignments = db.query(models.Assignment).count()
    total_submissions = db.query(models.Submission).count()
    approved_assignments = db.query(models.Assignment).filter(models.Assignment.is_approved.is_(True)).count()
    pending_submissions = db.query(models.Submission).filter(models.Submission.status != 'completed').count()

    return schemas.AnalyticsResponse(
        assignments_total=total_assignments,
        submissions_total=total_submissions,
        approved_assignments=approved_assignments,
        pending_submissions=pending_submissions,
    )


def parse_submission(language: str, source: str) -> ParsedSubmission:
    if language.lower() == 'python':
        return python_adapter.parse_source(source)
    if language.lower() == 'java':
        return java_adapter.parse_source(source)
    if language.lower() == 'c':
        return c_adapter.parse_source(source)
    raise HTTPException(status_code=400, detail='Unsupported language')
