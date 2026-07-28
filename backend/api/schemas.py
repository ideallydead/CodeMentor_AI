from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.core.schemas import ParsedSubmission, Diagnostic


class QuestionCreate(BaseModel):
    title: str
    description: str
    language: str


class QuestionUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    language: Optional[str]
    draft_tests: Optional[List[Dict[str, Any]]]
    draft_viva: Optional[List[Dict[str, Any]]]


class QuestionResponse(BaseModel):
    id: int
    title: str
    description: str
    language: str
    is_approved: bool
    draft_tests: List[Dict[str, Any]]
    draft_viva: List[Dict[str, Any]]


class SubmissionCreate(BaseModel):
    assignment_id: int
    student_id: int
    source_code: str
    language: str


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    language: str
    status: str


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
