# Assessment Agent Implementation Plan

## Executive Summary
The Assessment Agent is the **first of four submission-time agents** responsible for evaluating code correctness, standards compliance, and efficiency. It consumes already-computed data (no re-parsing, no re-execution) and produces deterministic scores with LLM-generated justifications.

---

## 1. Input Contract

### Source 1: ParsedSubmission (from orchestrator)
**Location**: `backend/core/schemas.py::ParsedSubmission`

Contains:
- `submission_id`: str
- `language`: str (c, java, python)
- `source`: str (the full source code)
- `ast_summary`: ASTSummary (tree structure, function/class counts, etc.)
- `complexity`: ComplexityMetrics (cyclomatic_complexity, maintainability_index, etc.)
- `diagnostics`: List[Diagnostic] (static analysis violations already computed)
- `static_findings`: List[Diagnostic] (same as diagnostics, for clarity)
- `metadata`: Dict[str, Any]

**Assessment Agent's Role**: 
- Do NOT re-parse or re-lint — these are already done.
- Do NOT re-run tests — sandbox results are already in metadata or passed separately.
- **Consume the complexity metrics and diagnostics as-is.**

### Source 2: Test Suite (from DB)
**Fetched via**: Assignment ID → Query TestCase records from DB

Each TestCase has:
- `id`: str (test_id for reports)
- `assignment_id`: str (match to current submission's assignment)
- `input_data`: str (serialized input; JSON or argv-style)
- `expected_output`: str (expected stdout/exit code/return value)
- `active`: bool (only run active test cases)

**Assessment Agent's Role**: 
- Fetch active test cases for this assignment.
- Compare against sandbox execution results (already in ParsedSubmission.metadata or passed as separate argument).

### Source 3: Sandbox Execution Results (new input parameter)
**Passed as**: `sandbox_results: SandboxResults` (new model to define)

New Pydantic model:
```python
class SandboxTestResult(BaseModel):
    test_id: str
    passed: bool
    actual_output: str
    execution_time_ms: float
    error_message: Optional[str] = None

class SandboxResults(BaseModel):
    submission_id: str
    language: str
    test_results: List[SandboxTestResult]
    compilation_error: Optional[str] = None
    timeout_error: Optional[str] = None
```

---

## 2. Output Contract

### Pydantic Model: AssessmentReport

```python
class FailedTestCase(BaseModel):
    test_id: str
    input_data: str
    expected_output: str
    actual_output: str
    reason: str  # e.g., "Output mismatch" or "Compilation error" or "Timeout"

class FlaggedIssue(BaseModel):
    line_number: int
    category: str  # e.g., "complexity", "style", "performance"
    description: str
    severity: str  # "info", "warning", "error"
    source_evidence: str  # e.g., "cyclomatic_complexity=12" or "unused variable"

class AssessmentReport(BaseModel):
    submission_id: str
    correctness_score: int  # 0-100, derived from test pass rate
    standards_score: int    # 0-100, derived from static findings
    efficiency_score: int   # 0-100, derived from complexity metrics
    overall_recommendation: str  # "excellent", "good", "fair", "needs_improvement"
    failed_tests: List[FailedTestCase]
    flagged_issues: List[FlaggedIssue]
    justification_text: str  # LLM-generated narrative
```

---

## 3. Scoring Logic (DETERMINISTIC)

### 3.1 Correctness Score (0-100)
**Source**: Sandbox test results vs. approved test suite

**Formula**:
```
pass_rate = (tests_passed / total_active_tests) * 100
correctness_score = int(pass_rate)  # Simple 1:1 mapping
```

**Boundary Conditions**:
- 0 tests run (compilation error) → `correctness_score = 0`
- All pass → `correctness_score = 100`
- Partial pass → scaled linearly

**⚠️ DECISION NEEDED**: 
Should there be **penalties** for timeouts vs. wrong output?
- Option A: Both count equally as "failed" → same impact on score
- Option B: Timeout = -5 bonus points beyond pass rate? (aggressive)
- Option C: Separate timeout/error categories but all reduce score uniformly?

**Recommend**: Option A (simpler, fair to students with different failure modes).

---

### 3.2 Standards Score (0-100)
**Source**: ParsedSubmission.diagnostics (static analysis findings)

**Categories** (from linters):
- `style_violation` (naming, spacing, import organization)
- `complexity_violation` (nested depth > 4, function length > 50 lines)
- `error` (unused variables, potential null dereference)

**Scoring Logic**:
```python
error_count = len([d for d in diagnostics if d.severity == "error"])
warning_count = len([d for d in diagnostics if d.severity == "warning"])
info_count = len([d for d in diagnostics if d.severity == "info"])

# Weighted penalty
penalty = (error_count * 10) + (warning_count * 3) + (info_count * 1)
standards_score = max(0, 100 - penalty)
```

**⚠️ DECISION NEEDED**: 
What are the penalty weights? Should they be:
- **Option A**: Aggressive (errors=10, warnings=3, info=1) → many errors drop score to 0 quickly
- **Option B**: Moderate (errors=5, warnings=2, info=0.5) → more forgiving
- **Option C**: Length-aware (penalties scale by number of lines of code)?

**Recommend**: Option A (incentivizes clean code early).

**Cap**: Even 1 error shouldn't auto-fail; allow recovery with good test results.

---

### 3.3 Efficiency Score (0-100)
**Source**: ParsedSubmission.complexity (cyclomatic_complexity, maintainability_index)

**Metrics Used**:
- **Cyclomatic Complexity** (CC): Measures decision paths
  - CC ≤ 5 → excellent (90-100 points)
  - CC 6-10 → good (70-89 points)
  - CC 11-15 → fair (50-69 points)
  - CC > 15 → poor (0-49 points)

- **Maintainability Index** (MI, 0-100 scale, already provided):
  - MI ≥ 80 → excellent
  - MI 60-79 → good
  - MI 40-59 → fair
  - MI < 40 → poor

**Formula**:
```python
cc_score = map_cc_to_score(cyclomatic_complexity)
mi_score = maintainability_index  # Already 0-100
efficiency_score = (cc_score * 0.4) + (mi_score * 0.6)  # MI weighted higher
```

**⚠️ DECISION NEEDED**: 
Should **function count** matter?
- Option A: Flag functions > 5 arguments as inefficient (add to flagged_issues but don't change score)
- Option B: Include function argument count in efficiency score directly
- Option C: Ignore (focus on CC and MI)

**Recommend**: Option A (let justification text explain, don't double-count in score).

**Cap**: Even a poor efficiency score shouldn't fail correctness; these are separate concerns.

---

### 3.4 Overall Recommendation (string)
**Derived From**: Weighted average of the three scores

```python
weighted_avg = (correctness_score * 0.5) + (standards_score * 0.25) + (efficiency_score * 0.25)

if weighted_avg >= 90:
    recommendation = "excellent"
elif weighted_avg >= 75:
    recommendation = "good"
elif weighted_avg >= 60:
    recommendation = "fair"
else:
    recommendation = "needs_improvement"
```

**Note**: Faculty always has final say; this is just a suggestion.

---

## 4. Flagged Issues (Deterministic)

### 4.1 From Static Analysis
Map each diagnostic to a FlaggedIssue:
```python
for diag in parsed_submission.diagnostics:
    FlaggedIssue(
        line_number=diag.line,
        category=diag.type,  # "style", "complexity", "error"
        description=diag.message,
        severity=diag.severity,
        source_evidence=diag.source_context
    )
```

### 4.2 From Complexity Metrics
If cyclomatic complexity > 15:
```python
FlaggedIssue(
    line_number=function_line,  # Line where function starts
    category="complexity",
    description=f"High cyclomatic complexity ({cc}); consider breaking into smaller functions",
    severity="warning",
    source_evidence=f"cyclomatic_complexity={cc}"
)
```

### 4.3 From Test Failures
Each failed test creates a reference issue:
```python
FlaggedIssue(
    line_number=0,  # Doesn't apply to specific line
    category="correctness",
    description=f"Test {test_id} failed",
    severity="error",
    source_evidence=f"Expected: {expected}, Got: {actual}"
)
```

---

## 5. Justification Text (LLM-Generated)

### Prompt Template
```
You are a code reviewer for an online learning platform. Provide a brief, 
constructive justification (2-3 sentences per section) for the following assessment:

Student Submission:
- Language: {language}
- Correctness: {correctness_score}/100 ({pass_count}/{total_tests} tests passed)
- Standards: {standards_score}/100 ({error_count} style/logic issues found)
- Efficiency: {efficiency_score}/100 (Cyclomatic complexity: {cc}, Maintainability: {mi})

Failed Tests:
{failed_tests_summary}

Code Issues Found:
{flagged_issues_summary}

Recommendation Band: {overall_recommendation}

Generate constructive feedback that:
1. Acknowledges what went well (if any)
2. Specifically addresses each failure with actionable next steps
3. Is encouraging but honest
4. Does NOT restate the student's code back to them
```

### LLM Integration
**Call**: `llm_client.generate(prompt, context={})`

**Determinism Note**: The LLM output varies, but that's acceptable for justification text. 
The scores themselves (correctness, standards, efficiency) are **always deterministic**.

---

## 6. Unit Testing Strategy

### Test Fixtures

#### Fixture 1: Fully Passing Submission
```python
@pytest.fixture
def passing_submission():
    return ParsedSubmission(
        submission_id="sub_001",
        language="python",
        source="def add(a, b): return a + b",
        ast_summary=ASTSummary(functions=1, classes=0),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=1,
            maintainability_index=95
        ),
        diagnostics=[],
        static_findings=[]
    )

@pytest.fixture
def passing_sandbox_results():
    return SandboxResults(
        submission_id="sub_001",
        language="python",
        test_results=[
            SandboxTestResult(test_id="t1", passed=True, actual_output="3"),
            SandboxTestResult(test_id="t2", passed=True, actual_output="5")
        ]
    )
```

**Expected Output**:
- `correctness_score = 100`
- `standards_score = 100`
- `efficiency_score = 95+`
- `overall_recommendation = "excellent"`
- `failed_tests = []`
- `flagged_issues = []`

---

#### Fixture 2: Partially Failing Submission
```python
@pytest.fixture
def failing_submission():
    return ParsedSubmission(
        submission_id="sub_002",
        language="python",
        source="def bubble_sort(arr):\n    for i in range(len(arr)):\n        for j in range(len(arr)-1):\n            if arr[j] > arr[j+1]: ...",
        ast_summary=ASTSummary(functions=1, classes=0),
        complexity=ComplexityMetrics(
            cyclomatic_complexity=18,  # High!
            maintainability_index=42  # Low
        ),
        diagnostics=[
            Diagnostic(line=2, severity="error", message="Unused variable 'k'"),
            Diagnostic(line=1, severity="warning", message="Complex function")
        ]
    )

@pytest.fixture
def failing_sandbox_results():
    return SandboxResults(
        submission_id="sub_002",
        language="python",
        test_results=[
            SandboxTestResult(test_id="t1", passed=True, actual_output="[1,2,3]"),
            SandboxTestResult(test_id="t2", passed=False, actual_output="[3,2,1]"),
            SandboxTestResult(test_id="t3", passed=False, actual_output="Timeout")
        ]
    )
```

**Expected Output**:
- `correctness_score = 33` (1/3 pass)
- `standards_score = 90` (error=-10, warning=-3 = 87, but capped at 90)
- `efficiency_score ≈ 20-30` (very high CC, low MI)
- `overall_recommendation = "needs_improvement"`
- `failed_tests = [t2, t3]`
- `flagged_issues = [line 2, line 1, line 1 (CC)]`

---

### Tests to Write
1. **test_correctness_score_100_percent** → All pass
2. **test_correctness_score_50_percent** → Half fail
3. **test_correctness_score_0_percent** → All fail
4. **test_standards_score_deduction** → Errors/warnings reduce score
5. **test_efficiency_score_high_cc** → High CC drops score
6. **test_efficiency_score_low_mi** → Low MI drops score
7. **test_flagged_issues_populated** → Diagnostics + complexity issues appear
8. **test_recommendation_band** → Correct band selected
9. **test_deterministic_scoring** → Same input → same scores (run twice, compare)
10. **test_llm_integration_called_once** → Mock LLM, verify called exactly once

---

## 7. Orchestrator Integration

### Entry Point in Orchestrator
```python
# In backend/orchestrator/orchestrator.py

async def run_assessment_pipeline(parsed_submission: ParsedSubmission) -> List[AgentOutput]:
    # Step 1: Run sandbox (already exists)
    sandbox_results = await sandbox_runner.run(parsed_submission)
    
    # Step 2: Run Assessment Agent ← NEW
    assessment_report = assessment_agent.assess(
        parsed_submission=parsed_submission,
        sandbox_results=sandbox_results,
        assignment_id=parsed_submission.metadata.get("assignment_id")
    )
    
    # Step 3-6: Other agents (still TODO stubs)
    mentor_output = mentor_agent.assess(parsed_submission)  # TODO
    optimization_output = optimization_agent.assess(parsed_submission)  # TODO
    viva_output = viva_agent.assess(parsed_submission)  # TODO
    testcase_output = testcase_agent.assess(parsed_submission)  # TODO
    integrity_output = integrity_agent.assess(parsed_submission)  # TODO
    
    return [
        assessment_report,
        mentor_output,
        optimization_output,
        viva_output,
        testcase_output,
        integrity_output
    ]
```

### Database Storage
- Save `AssessmentReport` to DB as JSON (in `Report.aggregated_output`)
- Link to `Submission` record

---

## 8. Implementation Checklist

- [ ] Define `SandboxResults` and related models in `backend/core/schemas.py`
- [ ] Define `AssessmentReport` and related models in `backend/agents/schemas.py` (new file)
- [ ] Implement scoring functions (deterministic, no LLM):
  - [ ] `calculate_correctness_score()`
  - [ ] `calculate_standards_score()`
  - [ ] `calculate_efficiency_score()`
  - [ ] `derive_recommendation()`
- [ ] Implement issue flagging:
  - [ ] `extract_flagged_issues()`
- [ ] Implement LLM justification:
  - [ ] `generate_justification_text()` (uses LLM client)
- [ ] Implement main agent function:
  - [ ] `assess(parsed_submission, sandbox_results, assignment_id) -> AssessmentReport`
- [ ] Write unit tests (10 tests minimum)
- [ ] Mock LLM client in tests (use pytest-mock)
- [ ] Wire into orchestrator
- [ ] Add docstrings with examples

---

## 9. Open Questions for User

### 🔴 CRITICAL DECISIONS NEEDED:

1. **Correctness Score Penalties**:
   - Should timeout and wrong output both count as "failed" equally?
   - Or should timeouts be treated more/less severely?

2. **Standards Score Weights**:
   - Errors: -10 points each (current)? Or -5/-15?
   - Warnings: -3 points each? Or -1/-5?
   - Info: -1 point each? Or ignore?

3. **Efficiency Score Thresholds**:
   - CC > 15 is "poor" — is this correct for your course?
   - Should MI be weighted 60% vs. CC 40%, or different ratio?

4. **Complexity Penalties**:
   - Should high CC also reduce correctness/standards, or only efficiency?
   - Or should it only appear in flagged_issues without score impact?

5. **Test Case Handling**:
   - If a test times out, should it be shown separately from "wrong answer" failures?
   - Should the justification text suggest specific optimization strategies?

6. **Recommendation Thresholds**:
   - "excellent" ≥ 90, "good" ≥ 75, "fair" ≥ 60 — correct?
   - Should these account for student ability level (e.g., beginner vs. advanced)?

---

## 10. Success Criteria

✅ Assessment Report is fully deterministic (same input → same numeric scores)
✅ LLM justification is generated but doesn't influence scoring
✅ Unit tests cover all three score types + boundary cases
✅ Tests pass with 100% coverage on scoring logic
✅ Flagged issues reference actual line numbers from source
✅ Orchestrator calls agent correctly and stores output
✅ No re-parsing, no re-linting, no re-execution within this agent
✅ Output schema allows Mentor/Optimization/Viva to follow same pattern

---

## Files to Create/Modify

1. **Create**: `backend/agents/assessment_agent.py` (main implementation)
2. **Create**: `backend/agents/schemas.py` (AssessmentReport + related models)
3. **Modify**: `backend/core/schemas.py` (add SandboxResults model)
4. **Create**: `backend/agents/test_assessment_agent.py` (unit tests)
5. **Modify**: `backend/orchestrator/orchestrator.py` (wire in agent)

