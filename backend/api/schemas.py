from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.core.schemas import ParsedSubmission, Diagnostic


class QuestionCreate(BaseModel):
    title: str
    description: str
    language: str


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    draft_tests: Optional[List[Dict[str, Any]]] = None
    draft_viva: Optional[List[Dict[str, Any]]] = None


class QuestionResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    language: str
    is_approved: bool
    draft_tests: Optional[List[Dict[str, Any]]] = []
    draft_viva: Optional[List[Dict[str, Any]]] = []


class SubmissionCreate(BaseModel):
    assignment_id: int
    student_id: int
    source_code: str
    language: str
    viva_answers: Optional[List[Dict[str, Any]]] = None


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    language: str
    status: str
    final_grade: Optional[str] = None
    faculty_score: Optional[int] = None
    faculty_notes: Optional[str] = None
    viva_answers: Optional[List[Dict[str, Any]]] = None
    viva_verified: Optional[bool] = False
    viva_score: Optional[int] = None
    viva_feedback: Optional[str] = None


class SubmissionVivaUpdateRequest(BaseModel):
    viva_answers: List[Dict[str, Any]]


class ReportResponse(BaseModel):
    id: int
    submission_id: int
    aggregated_output: Dict[str, Any]


class AnalyticsResponse(BaseModel):
    assignments_total: int
    submissions_total: int
    approved_assignments: int
    pending_submissions: int


class SubmissionStatusResponse(BaseModel):
    id: int
    status: str
    details: Optional[Dict[str, Any]]


class ParseResponse(BaseModel):
    parsed_submission: ParsedSubmission
    diagnostics: List[Diagnostic] = []


class FacultyOverrideRequest(BaseModel):
    faculty_score: Optional[int] = None
    final_grade: Optional[str] = None
    faculty_notes: Optional[str] = None
    viva_verified: Optional[bool] = None
    viva_score: Optional[int] = None
    viva_feedback: Optional[str] = None
    viva_answers: Optional[List[Dict[str, Any]]] = None


class MisconceptionItem(BaseModel):
    misconception: str
    affected_students_count: int
    percentage_of_class: float


class ConsolidatedSubmissionItem(BaseModel):
    id: int
    student_id: int
    status: str
    language: str
    correctness_score: Optional[int] = None
    standards_score: Optional[int] = None
    efficiency_score: Optional[int] = None
    overall_recommendation: str
    integrity_risk: str
    is_resubmission: Optional[bool] = False
    attempt_number: Optional[int] = 1
    final_grade: Optional[str] = None
    faculty_score: Optional[int] = None
    faculty_notes: Optional[str] = None
    created_at: Optional[str] = None
    source_code: Optional[str] = None
    viva_answers: Optional[List[Dict[str, Any]]] = []
    viva_verified: Optional[bool] = False
    viva_score: Optional[int] = None
    viva_feedback: Optional[str] = None
    justification_text: Optional[str] = None
    all_test_results: Optional[List[Dict[str, Any]]] = []
    flagged_issues: Optional[List[Dict[str, Any]]] = []
    integrity_details: Optional[Dict[str, Any]] = None


class LatestSubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    source_code: str
    language: str
    created_at: Optional[str] = None


class FacultyIntelligenceResponse(BaseModel):
    assignment_id: int
    title: str
    language: str
    total_submissions: int
    class_averages: Dict[str, float]
    grade_distribution: Dict[str, int]
    top_misconceptions: List[MisconceptionItem]
    consolidated_submissions: List[ConsolidatedSubmissionItem]
    viva_summary: Optional[Dict[str, Any]] = None



class RunCodeRequest(BaseModel):
    assignment_id: int
    source_code: str
    language: str


class SandboxTestResultItem(BaseModel):
    test_id: str
    passed: bool
    actual_output: str
    execution_time_ms: float
    error_message: Optional[str] = None
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    failure_reason: Optional[str] = None


class RunCodeResponse(BaseModel):
    status: str
    compilation_error: Optional[str] = None
    timeout_error: Optional[str] = None
    total_tests: int
    passed_tests: int
    test_results: List[SandboxTestResultItem]

