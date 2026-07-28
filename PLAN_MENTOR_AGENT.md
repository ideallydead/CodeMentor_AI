## Mentor Agent Implementation Plan

### Overview
The Mentor Agent consumes `AssessmentReport` + `ParsedSubmission` to deliver Socratic pedagogical feedback. It emphasizes guiding questions and conceptual exploration rather than code solutions.

---

## 1. Schema Design (`backend/agents/schemas.py` - APPEND)

### MentorHint
```
Fields:
- topic: str
  Description: Concept being addressed (e.g., "loop_efficiency", "off_by_one_error")
  
- socratic_question: str
  Description: Guiding question to prompt discovery (e.g., "What does this loop iterate over exactly?")
  
- concept_to_review: str
  Description: Related concept/topic to review (e.g., "array indexing", "loop bounds")
```

### MentorReport
```
Fields:
- overall_encouragement: str
  Description: Personalized positive message acknowledging effort
  
- hints: List[MentorHint]
  Description: Targeted hints for each failure (empty if perfect submission)
  
- suggested_reading: List[str]
  Description: Recommended topics/resources to review (e.g., "Big O notation", "recursion basics")
```

---

## 2. Agent Logic (`backend/agents/mentor_agent.py`)

### MentorEngine Class
```
Static methods:

1. categorize_failure(failed_test: FailedTestCase, parsed_submission: ParsedSubmission) 
   → str (category: "logic_error", "boundary_error", "performance_issue", "style_issue")
   
   Logic:
   - Use diagnostic codes + failure type to infer category
   - Example: "timeout" error + high CC → "performance_issue"

2. generate_socratic_hints(
     failed_tests: List[FailedTestCase],
     flagged_issues: List[FlaggedIssue],
     correctness_score: int
   ) → List[MentorHint]
   
   Logic:
   - For each failed test: Create hint without showing the solution
   - For each flagged issue: Translate to concept-focused hint
   - Deduplicate hints by topic
   - Limit to top 3-5 most impactful hints

3. derive_suggested_reading(
     flagged_issues: List[FlaggedIssue],
     complexity_metrics: ComplexityMetrics
   ) → List[str]
   
   Logic:
   - Map issue categories to topics (e.g., "complexity" → "Big O notation")
   - Add performance topics if CC high or MI low
   - Return 3-5 recommended topics
```

### JustificationGenerator (for Mentor)
```
Method: generate_mentor_feedback(
  is_perfect: bool,
  language: str,
  correctness_score: int,
  hints: List[MentorHint],
  num_failed_tests: int
) → str

Logic:
- If is_perfect:
  Prompt LLM to generate praise + next-level conceptual questions
- Else:
  Prompt LLM to explain why the feedback is encouraging despite failures
  + guide towards conceptual understanding
- Emphasize growth mindset
```

### Main Entry Point
```
mentor_agent(
  parsed_submission: ParsedSubmission,
  assessment_report: AssessmentReport,
  llm_client: Optional[LLMClient] = None
) → AgentOutput

Logic:
1. Initialize MentorEngine
2. Determine if perfect (correctness_score == 100)
3. Generate hints (empty list if perfect)
4. Derive suggested reading
5. Call JustificationGenerator for overall_encouragement
6. Create MentorReport
7. Wrap in AgentOutput for orchestrator
```

---

## 3. Orchestrator Integration (`backend/orchestrator/orchestrator.py`)

### Current Flow:
```
Assessment Agent → Mentor Agent → Optimization → Viva → Testcase → Integrity
```

### Update:
```python
def run_assessment_pipeline(
    parsed_submission: ParsedSubmission, 
    sandbox_results: SandboxResults
) -> List[AgentOutput]:
    
    outputs = []
    
    # 1. Assessment
    assessment_output = assessment_agent(parsed_submission, sandbox_results)
    outputs.append(assessment_output)
    
    # Extract AssessmentReport from details
    assessment_report = AssessmentReport(**assessment_output.details)
    
    # 2. Mentor (NEW: pass assessment_report)
    outputs.append(mentor_agent(parsed_submission, assessment_report))
    
    # 3-6. Other agents (existing TODOs)
    ...
```

---

## 4. Test Suite (`backend/agents/test_mentor_agent.py`)

### Test Structure

#### Fixtures
1. `perfect_submission()` + `perfect_assessment()` 
   - correctness_score = 100, no failures
2. `failing_submission()` + `failing_assessment()`
   - correctness_score = 33, multiple failures
3. `mock_llm_client()`
   - Returns mentor-specific feedback

#### Test Cases

**Category 1: Perfect Submission (Praise Path)**
- `test_perfect_generates_encouragement()` 
  - Assert: no hints, positive encouragement
- `test_perfect_generates_next_level_questions()`
  - Assert: encouragement contains conceptual/advanced topics

**Category 2: Failing Submission (Socratic Path)**
- `test_failing_generates_hints()`
  - Assert: hints list is non-empty
- `test_hints_are_socratic_not_solutions()`
  - Assert: no code snippets in hints, only questions
- `test_hints_map_to_failures()`
  - Assert: number of hints ≤ number of failed tests (deduped)
- `test_suggested_reading_includes_topics()`
  - Assert: suggested_reading list populated with concept names
- `test_deterministic_hint_generation()`
  - Assert: same assessment → same hints twice

**Category 3: LLM Failure Path**
- `test_llm_timeout_returns_fallback_hints()`
  - Mock LLM.generate() to raise timeout
  - Assert: hints still generated from categorization logic
- `test_llm_error_graceful_degradation()`
  - Mock LLM.generate() to raise generic Exception
  - Assert: encouragement is generic but hints are still present

**Category 4: Output Structure**
- `test_output_wrapped_in_agent_output()`
  - Assert: correct agent_name, summary, details structure
- `test_mentor_report_schema_valid()`
  - Assert: MentorReport.model_validate() succeeds

**Category 5: Edge Cases**
- `test_empty_failures_no_hints()`
  - correctness_score = 100, empty failed_tests
- `test_many_failures_hints_limited_to_5()`
  - 10+ failures, assert len(hints) ≤ 5
- `test_hints_deduplicate_same_topic()`
  - Multiple failures on same concept → single hint

#### Mocking Pattern
```python
mock_llm = Mock()
mock_llm.generate.return_value = {
    "response": "Great effort on understanding..."
}
```

#### Test Coverage Goals
- All code paths in MentorEngine
- Both perfect and failing submission scenarios
- LLM integration + error handling
- Socratic method verification (no code in hints)
- Schema validation

---

## 5. Implementation Order

1. Add schemas to `backend/agents/schemas.py` (MentorHint, MentorReport)
2. Implement `backend/agents/mentor_agent.py` (MentorEngine, JustificationGenerator, mentor_agent)
3. Create `backend/agents/test_mentor_agent.py` (all test cases)
4. Update `backend/orchestrator/orchestrator.py` (wire mentor_agent with assessment_report)
5. Run full test suite: `pytest backend/agents/test_mentor_agent.py -v`

---

## 6. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Socratic method only | Aligns with pedagogical goal; teaches problem-solving, not coding |
| Deduplicated hints | Prevents overwhelming student with repeated concepts |
| Max 5 hints | Keeps feedback focused; more than 5 is cognitive overload |
| Perfect score path | Celebrates success; next-level thinking maintains engagement |
| LLM fallback | Ensures hints generated even if LLM fails; hints come from deterministic categorization |
| Optional LLM client | Allows testing without external dependency; patterns match Assessment Agent |

---

## 7. Success Criteria

✅ **Schema Validation**: MentorHint and MentorReport pass Pydantic validation  
✅ **Socratic Compliance**: Zero code snippets in any hint or encouragement  
✅ **Determinism**: Same assessment → same hints every time (except LLM text)  
✅ **Test Coverage**: 15+ unit tests, all passing  
✅ **Orchestrator Integration**: Assessment → Mentor pipeline works end-to-end  
✅ **Error Handling**: LLM timeouts/errors handled gracefully  
✅ **Performance**: Mentor agent runs in <1s on typical submission  

---

## 8. Example Outputs

### Perfect Submission
```json
{
  "overall_encouragement": "Excellent work! Your solution demonstrates strong understanding of algorithmic efficiency...",
  "hints": [],
  "suggested_reading": ["Optimization techniques for large datasets"]
}
```

### Failing Submission (1/3 tests pass)
```json
{
  "overall_encouragement": "You've got one test passing—that's a great start! Let's explore the areas where your solution needs adjustment...",
  "hints": [
    {
      "topic": "boundary_conditions",
      "socratic_question": "What happens at the very beginning and end of your array? Can your loop handle those positions?",
      "concept_to_review": "Array indexing and loop bounds"
    },
    {
      "topic": "loop_logic",
      "socratic_question": "Trace through your loop manually with a small example. Does each iteration produce what you expected?",
      "concept_to_review": "Loop invariants"
    }
  ],
  "suggested_reading": ["Array indexing", "Loop bounds", "Debugging techniques"]
}
```

---

**AWAITING APPROVAL TO PROCEED WITH IMPLEMENTATION**
