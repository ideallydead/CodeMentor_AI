"""
Pydantic schemas for Assessment Agent output.

These models encapsulate the structured findings from code analysis,
test execution, and complexity metrics, plus LLM-generated justification.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class FailedTestCase(BaseModel):
    """Details of a test case that failed execution."""
    test_id: str = Field(..., description="Unique ID of the test case")
    input_data: str = Field(..., description="Input provided to the code")
    expected_output: str = Field(..., description="Expected output")
    actual_output: str = Field(..., description="Actual output from sandbox")
    reason: str = Field(..., description="Why it failed: 'Output mismatch', 'Timeout', 'Compilation error', etc.")


class FlaggedIssue(BaseModel):
    """A single code quality issue flagged during analysis."""
    line_number: int = Field(..., ge=0, description="Line number (0 for whole-file issues)")
    category: str = Field(..., description="Issue category: 'complexity', 'style', 'correctness', 'performance', 'error'")
    description: str = Field(..., description="Human-readable description of the issue")
    severity: str = Field(..., description="'info', 'warning', or 'error'")
    source_evidence: str = Field(..., description="Specific evidence: 'cyclomatic_complexity=18', 'unused variable x', test ID, etc.")


class AssessmentReport(BaseModel):
    """
    Complete assessment of a student submission.
    
    Scoring is deterministic: same input always produces the same numeric scores.
    Only the justification_text may vary between runs (LLM-generated).
    """
    submission_id: str = Field(..., description="Link to the submission being assessed")
    
    # Deterministic scores (0-100)
    correctness_score: int = Field(..., ge=0, le=100, description="Test pass rate: (passed / total) * 100")
    standards_score: int = Field(..., ge=0, le=100, description="Code quality from static analysis")
    efficiency_score: int = Field(..., ge=0, le=100, description="From complexity metrics (CC and MI)")
    
    # High-level assessment
    overall_recommendation: str = Field(
        ...,
        description="Suggested grade band: 'excellent', 'good', 'fair', or 'needs_improvement'",
        pattern="^(excellent|good|fair|needs_improvement)$"
    )
    
    # Evidence and details
    failed_tests: List[FailedTestCase] = Field(default_factory=list, description="List of test cases that failed")
    flagged_issues: List[FlaggedIssue] = Field(default_factory=list, description="Code issues found")
    
    # Narrative explanation
    justification_text: str = Field(..., description="LLM-generated explanation of the assessment")

    class Config:
        json_schema_extra = {
            "example": {
                "submission_id": "sub_001",
                "correctness_score": 75,
                "standards_score": 85,
                "efficiency_score": 60,
                "overall_recommendation": "good",
                "failed_tests": [
                    {
                        "test_id": "t3",
                        "input_data": "[3, 1, 4, 1, 5]",
                        "expected_output": "1",
                        "actual_output": "3",
                        "reason": "Output mismatch"
                    }
                ],
                "flagged_issues": [
                    {
                        "line_number": 5,
                        "category": "complexity",
                        "description": "High cyclomatic complexity; consider refactoring",
                        "severity": "warning",
                        "source_evidence": "cyclomatic_complexity=12"
                    }
                ],
                "justification_text": "Your solution passes 3 out of 4 tests but has issues with edge cases..."
            }
        }


class DetectedConcept(BaseModel):
    """Details of a programming concept/construct detected in the AST summary."""
    concept_name: str = Field(..., description="Name of the detected programming concept")
    ast_evidence: str = Field(..., description="AST evidence, e.g. node type or line reference that triggered detection")


class ConceptExplanation(BaseModel):
    """Student-friendly explanation for a detected concept."""
    concept_name: str = Field(..., description="Name of the concept being explained")
    explanation_text: str = Field(..., description="Short student-friendly explanation of what the construct is for (2-4 sentences)")


class MentorHint(BaseModel):
    """A Socratic guiding hint prompting discovery without giving away code solutions."""
    topic: str = Field(..., description="Concept being addressed (e.g., 'boundary_conditions', 'loop_logic')")
    socratic_question: str = Field(..., description="Guiding question to prompt discovery without revealing solutions")
    concept_to_review: str = Field(..., description="Related concept or topic to review")


class MentorReport(BaseModel):
    """
    Complete output of the Socratic Mentor Agent.
    
    Delivers growth mindset encouragement, targeted Socratic hints for failures,
    and recommended reading topics to guide the student toward conceptual mastery.
    """
    overall_encouragement: str = Field(..., description="Personalized growth mindset message acknowledging effort")
    hints: List[MentorHint] = Field(default_factory=list, description="Targeted Socratic hints for failures (empty if perfect submission)")
    suggested_reading: List[str] = Field(default_factory=list, description="Recommended topics/resources to review")
    concepts_detected: List[DetectedConcept] = Field(default_factory=list, description="Core programming concepts detected in AST")

    class Config:
        json_schema_extra = {
            "example": {
                "overall_encouragement": "Great start on this assignment! Let's explore why boundary conditions require special care.",
                "hints": [
                    {
                        "topic": "boundary_conditions",
                        "socratic_question": "What happens at the very beginning and end of your array? Can your loop handle those positions?",
                        "concept_to_review": "Array indexing and loop bounds"
                    }
                ],
                "suggested_reading": ["Array indexing", "Loop bounds", "Debugging techniques"],
                "concepts_detected": [
                    {
                        "concept_name": "list_comprehension",
                        "ast_evidence": "ListComp node at line 4"
                    }
                ]
            }
        }


# =============================================================================
# OPTIMIZATION AGENT SCHEMAS
# =============================================================================

class OptimizationFinding(BaseModel):
    """A performance bottleneck or algorithmic inefficiency detected in the code."""
    issue_type: str = Field(..., description="Category of bottleneck (e.g. 'nested_loops', 'redundant_allocation', 'suboptimal_search')")
    line_number: int = Field(..., ge=0, description="Line number of finding (0 if file-wide)")
    description: str = Field(..., description="Human-readable description of the inefficiency")
    complexity_impact: str = Field(..., description="Estimated impact on Big-O time or space complexity")
    suggested_optimization: str = Field(..., description="High-level algorithmic strategy to optimize")


class OptimizationReport(BaseModel):
    """Complete output of the Optimization Agent."""
    estimated_time_complexity: str = Field(..., description="Estimated Big-O time complexity (e.g. 'O(n^2)')")
    estimated_space_complexity: str = Field(..., description="Estimated Big-O space complexity (e.g. 'O(1)')")
    findings: List[OptimizationFinding] = Field(default_factory=list, description="Performance findings and bottlenecks")
    overall_summary: str = Field(..., description="High-level evaluation of algorithmic efficiency")


# =============================================================================
# VIVA AGENT SCHEMAS
# =============================================================================

class SelectedVivaQuestion(BaseModel):
    """A viva question selected and personalized for a student submission."""
    question_id: Optional[str] = Field(None, description="ID of question from approved bank")
    prompt: str = Field(..., description="The viva question prompt")
    expected_concepts: List[str] = Field(default_factory=list, description="Target concepts expected in student's answer")
    personalization_reason: str = Field(..., description="Explanation of why this question was selected based on student's code")


class VivaReport(BaseModel):
    """Complete output of the submission-time Viva Agent."""
    selected_questions: List[SelectedVivaQuestion] = Field(default_factory=list, description="Selected personalized viva questions")
    guidance_for_faculty: str = Field(..., description="Instructions for faculty during oral evaluation")


# =============================================================================
# INTEGRITY AGENT SCHEMAS
# =============================================================================

class RefactoringPattern(BaseModel):
    """Refactoring or code obfuscation pattern detected between submissions."""
    pattern_type: str = Field(..., description="E.g. 'identifier_renaming', 'loop_transformation', 'dead_code_insertion'")
    description: str = Field(..., description="Human readable explanation of the detected refactoring pattern")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score of detection")


class IntegrityMatchDetails(BaseModel):
    """Detailed structural match comparison with another submission."""
    matched_submission_id: str = Field(..., description="ID of the matching historical submission")
    matched_student_id: Optional[str] = Field(None, description="Student ID of matching submission (Faculty view only)")
    similarity_score: float = Field(..., ge=0.0, le=100.0, description="Percentage AST structural similarity (0-100)")
    matching_kgram_count: int = Field(..., ge=0, description="Number of matching canonical AST k-grams")
    total_kgram_count: int = Field(..., ge=0, description="Total k-grams in target submission")
    refactoring_patterns: List[RefactoringPattern] = Field(default_factory=list, description="Detected refactoring patterns")


class IntegrityReport(BaseModel):
    """Complete output of the Academic Integrity Agent."""
    submission_id: str = Field(..., description="Link to submission being evaluated")
    risk_level: str = Field(..., description="'low', 'moderate', or 'high'", pattern="^(low|moderate|high)$")
    max_similarity_score: float = Field(..., ge=0.0, le=100.0, description="Highest structural similarity found across historical submissions")
    matches: List[IntegrityMatchDetails] = Field(default_factory=list, description="Top matching submissions")
    explainable_summary: str = Field(..., description="Detailed explanation of structural analysis and academic integrity compliance")




