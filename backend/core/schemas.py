from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class Diagnostic(BaseModel):
    path: str
    line: int
    column: Optional[int]
    message: str
    severity: str
    code: Optional[str]


class ComplexityMetrics(BaseModel):
    cyclomatic_complexity: Optional[float]
    maintainability_index: Optional[float]
    loc: Optional[int]
    halstead_volume: Optional[float]
    rank: Optional[str]


class ASTSummary(BaseModel):
    language: str
    node_count: int
    function_count: int
    class_count: int
    imports: List[str]
    summary: Optional[str]
    metadata: Dict[str, Any] = {}


class ParsedSubmission(BaseModel):
    submission_id: str
    language: str
    source: str
    ast_summary: ASTSummary
    complexity: ComplexityMetrics
    diagnostics: List[Diagnostic]
    static_findings: List[Diagnostic]
    metadata: Dict[str, Any] = {}


class SandboxTestResult(BaseModel):
    """Result from executing a single test case in the sandbox."""
    test_id: str
    passed: bool
    actual_output: str
    execution_time_ms: float
    error_message: Optional[str] = None
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    failure_reason: Optional[str] = None


class SandboxResults(BaseModel):
    """Aggregated results from sandbox execution."""
    submission_id: str
    language: str
    test_results: List[SandboxTestResult]
    compilation_error: Optional[str] = None
    timeout_error: Optional[str] = None


class AgentOutput(BaseModel):
    agent_name: str
    summary: str
    recommendations: List[str] = []
    details: Dict[str, Any] = {}
