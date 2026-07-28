# CodeMentor AI - Remaining Work & Implementation Roadmap

> **Reference Document**: `Vijil_mini_ppt.pdf` (Mini Project Presentation by Vijil Raj, TCR25MCA-2057)  
> **Project Title**: CODEMENTOR AI: A Multi-Agent AI Framework for Automated Programming Assessment and Personalized Educational Feedback  
> **Target Stack**: FastAPI (Python 3.10+), React (JS ES6+), PostgreSQL / SQLite, Docker Container Sandbox, Multi-Agent LLM Infrastructure (Together AI / Fireworks AI / Groq serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama).

---

## Executive Summary

Based on a thorough comparative analysis between the architecture proposed in `Vijil_mini_ppt.pdf` and the current codebase, the core skeleton and basic workflows of **CodeMentor AI** are operational (including FastAPI routes, basic multi-agent orchestrator, student portal, and faculty dashboard). However, **6 major modules** specified in the presentation require further development and integration to reach full compliance with the presentation requirements.

---

## Comprehensive Status & Remaining Work Checklist

| Module / Feature Area | Presentation Specification | Current Codebase Status | Priority | Remaining Work Summary |
| :--- | :--- | :--- | :--- | :--- |
| **1. Academic Integrity Module** | AST-level structural similarity, explainable match report, plagiarism detection | Stubbed placeholder in `integrity_agent.py` | 🔴 **High** | Implement AST tree comparison, refactoring detection, match highlight reports, and UI integration. |
| **2. Secure Sandbox Containerization** | Network-less Docker/Docker-Compose sandbox execution against approved test suites | Direct host `subprocess` in `sandbox_runner.py` without Docker isolation | 🔴 **High** | Integrate dynamic Docker sandbox (`--net=none`), wire DB approved test cases into submission execution flow. |
| **3. C & Java Language Adapters** | `pycparser` + `cppcheck` (C), `javalang` (Java), `radon` (Python) complexity metrics | Basic regex/string parsers for C & Java; limited static diagnostic coverage | 🟡 **Medium** | Complete full AST parsing for Java (`javalang`) and C (`pycparser` + `cppcheck`), refine complexity calculation. |
| **4. Faculty Intelligence & Analytics** | Consolidated grading recommendations, class-level analytics on common misconceptions | Simple SQL record counts in `/api/analytics` | 🟡 **Medium** | Build class-wide misconception aggregation engine, error clustering, and instructor review/override interface. |
| **5. Open-Source LLM Provider Routing** | Cloud LLM APIs (Together AI, Fireworks AI, Groq) serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama | Hardcoded or mock provider calls across agents | 🟡 **Medium** | Standardize unified multi-provider LLM client with model routing, fallback handling, and rate limiting. |
| **6. Database & Deployment Readiness** | PostgreSQL database, Docker Compose environment | SQLite (`codementor.db`) configuration | 🟢 **Low** | Configure PostgreSQL connection parameters, Alembic database migrations, and production Docker Compose profiles. |

---

## Detailed Task Specifications for Manual Verification

---

### Module 1: Academic Integrity & AST Structural Similarity Agent
**Target Files**: `backend/agents/integrity_agent.py`, `backend/core/schemas.py`, `frontend/faculty-dashboard/src/App.jsx`

#### Key Requirements from Presentation:
- **Slide 15 & 20**: "Academic Integrity Module: explainable, AST-level structural similarity – not opaque percentages."
- **Slide 21**: Produce an **Integrity Report** output per submission.

#### Tasks to Complete:
- [ ] **AST Serialization & Storage**: Normalize AST trees (strip variable names, comments, whitespace; keep structural node types like loops, conditionals, function definitions).
- [ ] **Similarity Algorithms**: Implement sub-tree hashing / Tree Edit Distance / AST n-gram jaccard similarity calculation comparing new submissions against historical assignment submissions.
- [ ] **Refactoring & Drift Detection**: Detect structural equivalences (e.g., `for` loop converted to `while` loop, identifier renaming, code block reordering).
- [ ] **Explainable Report Generation**: Return exact matching node ranges, similarity scores, and textual explanations of structural overlap rather than a single raw score.
- [ ] **Orchestrator & UI Integration**: Include `integrity_agent` in `run_assessment_pipeline` and expose results in both Student Portal and Faculty Dashboard.

---

### Module 2: Network-Less Docker Sandbox Execution & Test Pipeline Wiring
**Target Files**: `backend/sandbox/sandbox_runner.py`, `backend/api/routes.py`, `docker-compose.yml`

#### Key Requirements from Presentation:
- **Slide 14 & 17**: "Containerization: Docker, Docker Compose (sandboxed execution)."
- **Slide 20 & 22**: "Executes in an isolated, network-less sandbox against the faculty-approved test suite from Question Setup."

#### Tasks to Complete:
- [ ] **Docker Container Isolation**: Update `sandbox_runner.py` to spawn ephemeral Docker containers (`docker run --rm --net=none --memory=256m --cpus=0.5`) running the submission code.
- [ ] **Local Fallback**: Retain a secure host process fallback with execution time limits when Docker daemon is unavailable.
- [ ] **Test Suite Pipeline Integration**: In `routes.py` `submit_code`, query approved `TestCase` records for the assignment, execute student code against each test case input in the sandbox, and build a complete `SandboxResults` object.
- [ ] **Pass Sandbox Results to Assessment Agent**: Ensure `assessment_agent` evaluates exact test case pass/fail ratios, stdout/stderr outputs, and runtime execution metrics.

---

### Module 3: Language Adapter & Static Analysis Enhancements
**Target Files**: `backend/adapters/c_adapter.py`, `backend/adapters/java_adapter.py`, `backend/adapters/python_adapter.py`

#### Key Requirements from Presentation:
- **Slide 18**: "Language parsers – `ast` (Python), `javalang` (Java), `pycparser` + `cppcheck` (C). Radon – cyclomatic complexity & maintainability metrics."
- **Slide 20**: "Generates an AST per language; syntax errors returned as immediate diagnostics. Detects coding-standard violations, computes complexity metrics."

#### Tasks to Complete:
- [ ] **Java Adapter (`javalang`)**: Parse Java source code into full AST using `javalang`, extract method signatures, class structures, loop depth, and calculate cyclomatic complexity.
- [ ] **C Adapter (`pycparser` & `cppcheck`)**: Integrate `pycparser` for AST parsing and `cppcheck` CLI/library binding for static analysis checks (memory leaks, uninitialized variables, pointer errors).
- [ ] **Complexity & Maintainability Standardization**: Compute Cyclomatic Complexity, Maintainability Index, and Line-of-Code metrics consistently across Python, Java, and C adapters.
- [ ] **Syntax Error Diagnostics**: Return line numbers and clear diagnostic tips for syntax parsing errors immediately before queuing execution.

---

### Module 4: Faculty Intelligence & Class-Level Analytics Module
**Target Files**: `backend/api/routes.py`, `backend/db/models.py`, `frontend/faculty-dashboard/src/App.jsx`

#### Key Requirements from Presentation:
- **Slide 15 & 20**: "Faculty Intelligence Module: grading recommendations + class-level analytics on common misconceptions."
- **Slide 24**: "Consolidated grading recommendations and class-level analytics for faculty."

#### Tasks to Complete:
- [ ] **Class Misconception Clustering**: Implement an aggregator service that analyzes feedback and static findings across all student submissions for an assignment to identify top 5 common errors/misconceptions.
- [ ] **Consolidated Grading Recommendation Table**: Aggregate correctness score, code quality score, efficiency score, and viva score into a overall recommended grade for faculty review.
- [ ] **Faculty Override System**: Allow faculty to review recommended grades, adjust final marks, and add custom feedback remarks.
- [ ] **Faculty Dashboard UI Enhancements**: Add visual charts for class score distribution, misconception frequencies, and submission timeline analytics.

---

### Module 5: Open-Source LLM Provider Routing & Inference Infrastructure
**Target Files**: `backend/agents/` (`assessment_agent.py`, `mentor_agent.py`, `optimization_agent.py`, `viva_agent.py`, `testcase_agent.py`)

#### Key Requirements from Presentation:
- **Slide 18**: "Cloud LLM inference API (Together AI / Fireworks AI / Groq) serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama."
- **Slide 25**: "Grounded in open-source LLMs accessed via inference APIs, the system is designed to be transparent, explainable, and affordable."

#### Tasks to Complete:
- [ ] **Unified Provider Client**: Build a central LLM client module supporting Groq, Together AI, and Fireworks AI APIs.
- [ ] **Code-Tuned Model Routing**: Route code analysis tasks to models such as `DeepSeek-Coder-33B`, `Qwen2.5-Coder-32B`, or `CodeLlama-34B`.
- [ ] **Fallback & Resiliency**: Implement fallback strategies (e.g. if Together AI API rate limits, fallback to Groq or local mock engine).
- [ ] **Token & Cost Monitoring**: Track token usage and API latency per agent run for administrative auditing.

---

### Module 6: PostgreSQL Migration & Production Deployment Setup
**Target Files**: `backend/db/session.py`, `docker-compose.yml`, `.env.example`

#### Key Requirements from Presentation:
- **Slide 17**: "Database: PostgreSQL, Containerization: Docker, Docker Compose."

#### Tasks to Complete:
- [ ] **PostgreSQL Database Support**: Ensure `backend/db/session.py` smoothly connects to PostgreSQL via `psycopg2` / `asyncpg` when configured via `.env`.
- [ ] **Alembic Migrations**: Setup Alembic for schema migrations across development and production environments.
- [ ] **Docker Compose Integration**: Finalize `docker-compose.yml` services for `frontend-student`, `frontend-faculty`, `backend-api`, `postgres-db`, and `sandbox-runner`.

---

## Verification Plan for Manual Verification

After implementing each module, perform the following verification steps:

1. **Academic Integrity Verification**:
   - Submit two code files with identical structure but renamed variables.
   - Verify that `integrity_agent` detects structural similarity (>80%) and generates an explainable match report.
2. **Sandbox Execution Verification**:
   - Submit a Python/Java/C code file that attempts network access (e.g. `urllib` / `curl`).
   - Confirm execution is blocked/isolated by the network-less sandbox (`--net=none`).
3. **C/Java Parsing Verification**:
   - Submit C code with missing semicolons or uninitialized pointers.
   - Verify immediate syntax/static error diagnostics returned from `c_adapter.py`.
4. **Faculty Analytics Verification**:
   - Submit 5 student solutions with a common bug (e.g., off-by-one loop error).
   - Check the Faculty Dashboard analytics view to verify the error is aggregated under "Common Class Misconceptions".
5. **End-to-End Test Suite Verification**:
   - Create an assignment with 3 test cases. Approve the assignment.
   - Submit a solution passing 2 out of 3 test cases.
   - Verify Assessment Agent receives exact pass ratio (2/3) and factor it into the score.
