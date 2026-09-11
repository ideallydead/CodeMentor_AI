# CodeMentor AI: File Structure & Function Location Guide

This document provides a comprehensive map of the **CodeMentor AI** codebase, detailing the project directory structure and cataloging every function, class, method, API route, and frontend handler along with its exact file location, line number, and technical purpose.

---

## Table of Contents

1. [Quick-Reference Symbol Index (Where Does Each Function Reside?)](#1-quick-reference-symbol-index)
2. [Complete Repository Directory Tree](#2-complete-repository-directory-tree)
3. [Language Adapters (`backend/adapters`)](#3-language-adapters-backendadapters)
4. [Execution Sandbox & Test Suite Runner (`backend/sandbox`)](#4-execution-sandbox--test-suite-runner-backendsandbox)
5. [Multi-Agent AI Assessment Subsystem (`backend/agents`)](#5-multi-agent-ai-assessment-subsystem-backendagents)
6. [Pipeline Orchestrator (`backend/orchestrator`)](#6-pipeline-orchestrator-backendorchestrator)
7. [Core Infrastructure & LLM Routing Engine (`backend/core`)](#7-core-infrastructure--llm-routing-engine-backendcore)
8. [Database Layer & Models (`backend/db`)](#8-database-layer--models-backenddb)
9. [API Routes, Endpoints & Application Root (`backend/api` & `backend/main.py`)](#9-api-routes-endpoints--application-root-backendapi--backendmainpy)
10. [Database Migrations (`alembic`)](#10-database-migrations-alembic)
11. [Management & Verification Scripts (`backend/` & Root)](#11-management--verification-scripts-backend--root)
12. [Frontend Applications & Handlers (`frontend/`)](#12-frontend-applications--handlers-frontend)
13. [Test Suite Function & Class Catalog (`tests`)](#13-test-suite-function--class-catalog)

---

## 1. Quick-Reference Symbol Index

The table below allows you to quickly look up any function or class across the entire codebase:

| Function / Symbol | Type | Location (File & Line) | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`parse_source` (Python)** | Function | [python_adapter.py:L13](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/python_adapter.py#L13) | Parses Python AST, extracts functions/classes, measures CC & Halstead |
| **`parse_source` (C)** | Function | [c_adapter.py:L133](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/c_adapter.py#L133) | Preprocesses C, parses pycparser AST, executes cppcheck & security heuristics |
| **`parse_source` (Java)** | Function | [java_adapter.py:L24](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/java_adapter.py#L24) | Parses Java via javalang, calculates Halstead, MI, and Cyclomatic Complexity |
| **`_preprocess_c_code`** | Helper | [c_adapter.py:L39](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/c_adapter.py#L39) | Strips `#include` / `#define` directives and injects standard C typedef stubs |
| **`_run_cppcheck`** | Helper | [c_adapter.py:L72](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/c_adapter.py#L72) | Runs external cppcheck CLI for memory leaks and static buffer warnings |
| **`_parse_java_tree`** | Helper | [java_adapter.py:L7](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/java_adapter.py#L7) | Parses Java code, applying synthetic class wrapper fallback if needed |
| **`execute_in_sandbox`** | Function | [sandbox_runner.py:L387](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/sandbox_runner.py#L387) | Entrypoint to execute student code in Docker container or host fallback |
| **`_execute_in_docker_container`** | Helper | [sandbox_runner.py:L102](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/sandbox_runner.py#L102) | Launches Docker with `--net=none`, memory limits, and CPU isolation |
| **`_execute_in_host_process`** | Helper | [sandbox_runner.py:L192](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/sandbox_runner.py#L192) | Runs local subprocess with temporary directories and strict timeout kill |
| **`_prepare_python_script`** | Helper | [sandbox_runner.py:L43](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/sandbox_runner.py#L43) | Wraps Python student code with test invocation and input piping harness |
| **`run_test_suite_against_code`** | Function | [test_suite_runner.py:L14](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/test_suite_runner.py#L14) | Evaluates active DB test cases, normalizes output, short-circuits compile errors |
| **`assessment_agent`** | Function | [assessment_agent.py:L339](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/assessment_agent.py#L339) | Core scoring agent: computes Correctness, Standards, Efficiency & grade band |
| **`AssessmentEngine`** | Class | [assessment_agent.py:L31](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/assessment_agent.py#L31) | Deterministic scoring math, diagnostic penalty deductions & issue extraction |
| **`JustificationGenerator`** | Class | [assessment_agent.py:L242](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/assessment_agent.py#L242) | Calls LLM to synthesize narrative assessment justification with fallback |
| **`mentor_agent`** | Function | [mentor_agent.py:L257](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/mentor_agent.py#L257) | Socratic mentor: conceptual guiding hints (no code), AST concept detection |
| **`MentorEngine`** | Class | [mentor_agent.py:L60](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/mentor_agent.py#L60) | Categorizes failure modes, derives Socratic questions & reading curriculum |
| **`optimization_agent`** | Function | [optimization_agent.py:L161](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/optimization_agent.py#L161) | Big-O time/space complexity estimator and algorithmic bottleneck analyzer |
| **`OptimizationEngine`** | Class | [optimization_agent.py:L23](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/optimization_agent.py#L23) | Analyzes loop nesting depths, quadratic concatenations, and memory overhead |
| **`viva_question_agent`** | Function | [viva_agent.py:L20](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/viva_agent.py#L20) | Generates 3–5 draft oral examination questions during assignment authoring |
| **`viva_agent`** | Function | [viva_agent.py:L78](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/viva_agent.py#L78) | Inspects submission AST features and selects personalized oral viva questions |
| **`integrity_agent`** | Function | [integrity_agent.py:L50](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/integrity_agent.py#L50) | Academic honesty engine: compares canonical k-grams to detect plagiarism |
| **`_calculate_jaccard_similarity`**| Helper | [integrity_agent.py:L8](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/integrity_agent.py#L8) | Computes intersection-over-union of k-gram token hashes |
| **`_detect_refactoring`** | Helper | [integrity_agent.py:L19](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/integrity_agent.py#L19) | Flags identifier renaming and control flow equivalence |
| **`generate_draft_tests`** | Function | [testcase_agent.py:L9](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/testcase_agent.py#L9) | Generates standard, boundary, and edge test cases for new assignments |
| **`generate_faculty_intelligence`**| Function | [faculty_intelligence.py:L7](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/faculty_intelligence.py#L7) | Aggregates class scores, grade distributions, and top 5 recurring misconceptions |
| **`run_assessment_pipeline`** | Async Func | [orchestrator.py:L37](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/orchestrator/orchestrator.py#L37) | Orchestrates sequential assessment + concurrent pedagogical agent execution |
| **`_run_agent_safe`** | Async Func | [orchestrator.py:L15](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/orchestrator/orchestrator.py#L15) | Error isolation wrapper: captures exceptions and prevents pipeline failures |
| **`normalize_ast`** | Function | [ast_normalizer.py:L71](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/ast_normalizer.py#L71) | Strips identifiers/literals, creates token stream, and builds 4-gram hashes |
| **`generate_k_grams`** | Function | [ast_normalizer.py:L57](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/ast_normalizer.py#L57) | Sliding window token hash generator for structural winnowing |
| **`LLMClient`** | Class | [llm_client.py:L88](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/llm_client.py#L88) | Multi-provider LLM gateway supporting Groq, Together, Fireworks, and OpenAI |
| **`get_agent_llm_client`** | Function | [llm_client.py:L221](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/llm_client.py#L221) | Resolves specific per-agent model and provider override configurations |
| **`_extract_json_from_text`** | Helper | [llm_client.py:L55](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/llm_client.py#L55) | Robust JSON parser that strips markdown code blocks and regex extracts objects |
| **`create_access_token`** | Function | [auth.py:L11](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/auth.py#L11) | Encodes JWT authentication tokens with configured expiration delta |
| **`verify_access_token`** | Function | [auth.py:L18](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/auth.py#L18) | Decodes and validates JWT tokens against the application secret key |
| **`init_db`** | Function | [session.py:L61](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/db/session.py#L61) | Initializes database engine, applies migrations, seeds default users |
| **`get_db`** | Generator | [session.py:L88](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/db/session.py#L88) | FastAPI dependency injection yielding scoped SQLAlchemy database sessions |
| **`get_questions`** | API Handler | [routes.py:L18](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L18) | `GET /api/questions` — Lists all assignments |
| **`get_question`** | API Handler | [routes.py:L24](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L24) | `GET /api/questions/{id}` — Retrieves single assignment by ID |
| **`create_question`** | API Handler | [routes.py:L32](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L32) | `POST /api/questions` — Creates question & auto-generates test/viva drafts |
| **`update_question`** | API Handler | [routes.py:L55](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L55) | `PUT /api/questions/{id}` — Updates assignment metadata and test cases |
| **`approve_question`** | API Handler | [routes.py:L69](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L69) | `POST /api/questions/{id}/approve` — Promotes draft tests to active `TestCase` rows |
| **`submit_code`** | API Handler | [routes.py:L94](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L94) | `POST /api/submissions` — Executes sandbox tests and triggers multi-agent pipeline |
| **`submission_status`** | API Handler | [routes.py:L172](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L172) | `GET /api/submissions/{id}/status` — Returns submission status and evaluation report |
| **`get_report`** | API Handler | [routes.py:L183](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L183) | `GET /api/reports/{id}` — Retrieves evaluation report details |
| **`get_faculty_intelligence`** | API Handler | [routes.py:L194](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L194) | `GET /api/questions/{id}/intelligence` — Retrieves class averages & misconceptions |
| **`override_submission_grade`**| API Handler | [routes.py:L202](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L202) | `POST /api/submissions/{id}/override` — Updates instructor score, grade, notes |
| **`get_analytics`** | API Handler | [routes.py:L221](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L221) | `GET /api/analytics` — Retrieves aggregate platform metrics |
| **`delete_question`** | API Handler | [routes.py:L236](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L236) | `DELETE /api/questions/{id}` — Cascading delete of question, submissions, reports |
| **`delete_submission`** | API Handler | [routes.py:L255](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L255) | `DELETE /api/submissions/{id}` — Deletes single student submission and report |
| **`reset_all_data`** | API Handler | [routes.py:L266](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L266) | `POST /api/reset-data` — Wipes all dynamic data and re-seeds default accounts |
| **`parse_submission`** | API Handler | [routes.py:L277](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py#L277) | `POST /api/parse` — Standalone endpoint to run AST adapters on source code |
| **`startup_event`** | App Event | [main.py:L31](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/main.py#L31) | Initializes database tables and default seeds on backend boot |
| **`root`** | App Route | [main.py:L36](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/main.py#L36) | Serves compiled student SPA `index.html` or health status |
| **`upgrade`** | Alembic DDL | [001_initial_schema.py:L19](file:///d:/mca_mini_vijil/CodeMentor_AI/alembic/versions/001_initial_schema.py#L19) | Schema creation migration for all 6 relational entities |
| **`downgrade`** | Alembic DDL | [001_initial_schema.py:L91](file:///d:/mca_mini_vijil/CodeMentor_AI/alembic/versions/001_initial_schema.py#L91) | Drops tables in reverse foreign-key dependency order |
| **`reset_database`** | CLI Script | [reset_db.py:L16](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/reset_db.py#L16) | Standalone script to drop all tables, recreate schema, and re-seed |
| **`run_live_test`** | CLI Script | [test_live_system.py:L23](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/test_live_system.py#L23) | Integration script simulating end-to-end question creation, submission, report |
| **`App` (Student)** | React Root | [student-portal/App.jsx:L52](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/student-portal/src/App.jsx#L52) | Student UI root: Monaco editor, language selector, 6 diagnostic tabs |
| **`handleStudentSubmit`** | React Handler | [student-portal/App.jsx:L235](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/student-portal/src/App.jsx#L235) | Dispatches student submission to backend, renders evaluations |
| **`App` (Faculty)** | React Root | [faculty-dashboard/App.jsx:L51](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/faculty-dashboard/src/App.jsx#L51) | Faculty UI root: analytics, authoring wizard, grade overrides |
| **`handleResetAllData`** | React Handler | [faculty-dashboard/App.jsx:L260](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/faculty-dashboard/src/App.jsx#L260) | UI button action triggering system-wide data wipe and re-seed |

---

## 2. Complete Repository Directory Tree

```text
CodeMentor_AI/
├── .env                              # Environment configuration (API keys, ports, DB URLs)
├── .env.example                      # Template environment variables
├── docker-compose.yml                # Multi-container dev orchestration (PostgreSQL, Backend, Frontends)
├── docker-compose.prod.yml           # Multi-container production orchestration
├── run.ps1                           # Automated Windows startup launcher
├── run.sh                            # Automated Linux/macOS startup launcher
├── reset_data.ps1                    # Windows database wipe & seed utility
├── reset_data.sh                     # Linux/macOS database wipe & seed utility
├── alembic.ini                       # Alembic migration configuration
├── PROJECT_STRUCTURE_AND_MODULES.md  # Architectural overview & module documentation
├── FILE_STRUCTURE_AND_FUNCTIONS.md   # (This document) Exhaustive file & function map
│
├── alembic/                          # Database schema migration versions
│   ├── env.py                        # Migration environment runner
│   └── versions/
│       └── 001_initial_schema.py     # Initial DDL table definitions
│
├── backend/                          # FastAPI Application Backend
│   ├── main.py                       # FastAPI initialization, CORS, static mounts
│   ├── requirements.txt              # Backend dependencies
│   ├── reset_db.py                   # Standalone database reset script
│   ├── test_live_system.py           # Live end-to-end integration test runner
│   │
│   ├── adapters/                     # Language AST & Static Analysis
│   │   ├── python_adapter.py         # Python AST parser & Radon metrics
│   │   ├── c_adapter.py              # C pycparser AST & cppcheck integration
│   │   ├── java_adapter.py           # Java javalang AST parser & Halstead metrics
│   │   └── test_adapters.py          # Unit tests for all three language adapters
│   │
│   ├── agents/                       # Multi-Agent Pedagogical Framework
│   │   ├── schemas.py                # Pydantic schemas for agent reports
│   │   ├── assessment_agent.py       # Deterministic scoring & grade justification
│   │   ├── mentor_agent.py           # Socratic feedback & concept detection
│   │   ├── optimization_agent.py     # Big-O complexity & bottleneck analysis
│   │   ├── viva_agent.py             # Draft viva generation & submission personalization
│   │   ├── integrity_agent.py        # AST canonical winnowing & plagiarism detection
│   │   ├── testcase_agent.py         # Test case generator for question authoring
│   │   ├── faculty_intelligence.py   # Class analytics & misconception aggregation
│   │   ├── test_assessment_agent.py  # Comprehensive assessment tests (32 tests)
│   │   ├── test_mentor_agent.py      # Mentor agent tests (10 tests)
│   │   ├── test_integrity_agent.py   # Plagiarism agent tests (3 tests)
│   │   └── test_phase3_agents.py     # Optimization, Viva & TestCase tests (6 tests)
│   │
│   ├── api/                          # REST API Endpoints & Schemas
│   │   ├── routes.py                 # FastAPI endpoint routes
│   │   ├── schemas.py                # Pydantic request & response models
│   │   ├── test_question_flow.py     # Question setup & approval tests (3 tests)
│   │   ├── test_faculty_intelligence.py # Faculty analytics tests (1 test)
│   │   └── test_delete_and_reset_endpoints.py # Deletion & reset tests (8 tests)
│   │
│   ├── core/                         # Shared Core Modules & LLM Clients
│   │   ├── ast_normalizer.py         # Code normalization, tokenization & k-grams
│   │   ├── auth.py                   # JWT generation & validation
│   │   ├── config.py                 # BaseSettings configuration reader
│   │   ├── llm_client.py             # Multi-provider LLM gateway (Groq, Together, etc.)
│   │   ├── schemas.py                # Core domain schemas (ParsedSubmission, Diagnostics)
│   │   └── test_llm_client.py        # Failover and parser tests (4 tests)
│   │
│   ├── db/                           # Database Layer
│   │   ├── models.py                 # SQLAlchemy ORM models (User, Assignment, etc.)
│   │   ├── session.py                # Database session factory & pooling
│   │   └── test_db_readiness.py      # DB readiness & SQLite fallback tests (3 tests)
│   │
│   ├── orchestrator/                 # Pipeline Coordination
│   │   ├── orchestrator.py           # Multi-agent asynchronous pipeline
│   │   └── test_orchestrator.py      # Concurrency & error-isolation tests (4 tests)
│   │
│   └── sandbox/                      # Code Execution Sandbox
│       ├── sandbox_runner.py         # Docker & host subprocess execution runner
│       ├── test_suite_runner.py      # Multi-test case runner against DB cases
│       ├── test_sandbox.py           # Sandbox runtime & timeout tests (5 tests)
│       └── test_testsuite_runner.py  # Test runner validation tests (3 tests)
│
└── frontend/                         # Frontend Web Applications
    ├── package.json                  # Workspace script runner
    ├── student-portal/               # React Application for Students
    │   ├── vite.config.js            # Port 5173 / 4173 configuration
    │   ├── src/
    │   │   ├── main.jsx              # React DOM mounting
    │   │   ├── App.jsx               # Monaco Editor & 6-tab diagnostic evaluation UI
    │   │   └── index.css             # Glassmorphism dark-mode styles
    │   └── index.html                # HTML entrypoint
    │
    └── faculty-dashboard/            # React Application for Instructors
        ├── vite.config.js            # Port 5174 / 4174 configuration
        ├── src/
        │   ├── main.jsx              # React DOM mounting
        │   ├── App.jsx               # Question authoring, analytics, grade overrides
        │   └── index.css             # Glassmorphism dark-mode styles
        └── index.html                # HTML entrypoint
```

---

## 3. Language Adapters (`backend/adapters`)

Language adapters convert raw student source code into a standardized `ParsedSubmission` schema.

### 3.1. Python Adapter
**File**: [backend/adapters/python_adapter.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/python_adapter.py)

- **`parse_source(source: str) -> ParsedSubmission`** (Line 13)
  - **Purpose**: Parses Python code using the standard `ast` module.
  - **Calculations**:
    - Walks the AST to count total nodes, functions (`ast.FunctionDef`, `ast.AsyncFunctionDef`), classes (`ast.ClassDef`), and imports.
    - Measures Cyclomatic Complexity (CC), Maintainability Index (MI), and Halstead volume via `radon` (with internal fallbacks if `radon` is unavailable).
    - Captures syntax errors and formats them into structured `Diagnostic` items with exact line and column coordinates.

---

### 3.2. C Adapter
**File**: [backend/adapters/c_adapter.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/c_adapter.py)

- **`class CASTVisitor(c_ast.NodeVisitor)`** (Line 11)
  - **`__init__(self)`** (Line 12): Initializes counters for functions, variables, statements, decisions, and Halstead operators/operands.
  - **`visit(self, node)`** (Line 20): Overrides the visitor to intercept `FuncDef`, `Decl`, `If`, `For`, `While`, `DoWhile`, `Switch`, `Case`, and binary operations (`&&`, `||`) to compute cyclomatic complexity.
- **`_preprocess_c_code(source: str) -> str`** (Line 39)
  - **Purpose**: Prepares raw C code for `pycparser`. Strips preprocessor directives (`#include`, `#define`, `#pragma`) and comments, and injects C standard library typedef stubs (`size_t`, `bool`, `FILE`, `printf`, `malloc`, `free`) to permit AST generation without system headers.
- **`_run_cppcheck(source: str) -> List[Diagnostic]`** (Line 72)
  - **Purpose**: Invokes `cppcheck --enable=all` via subprocess against a temporary file. Parses standard error to extract warnings and style violations.
- **`parse_source(source: str) -> ParsedSubmission`** (Line 133)
  - **Purpose**: End-to-end C parser. Applies pre-processing, invokes `pycparser` with synthetic `int main() { ... }` wrapping fallback if necessary, computes metrics, and runs static safety heuristics (detecting `gets()` and memory leaks).

---

### 3.3. Java Adapter
**File**: [backend/adapters/java_adapter.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/adapters/java_adapter.py)

- **`_parse_java_tree(source: str)`** (Line 7)
  - **Purpose**: Parses Java source using `javalang.parse.parse`. If parsing fails due to top-level statements or bare methods, wraps the code inside `public class _CodeWrapper { ... }` and retries.
- **`parse_source(source: str) -> ParsedSubmission`** (Line 24)
  - **Purpose**: Traverses the Java AST to count classes, methods, and imports. Inspects decision branches (`IfStatement`, `ForStatement`, `WhileStatement`, `DoStatement`, `CatchClause`, `SwitchStatementCase`, `TernaryExpression`, `&&`, `||`) to calculate cyclomatic complexity, Halstead vocabulary, and maintainability index.

---

## 4. Execution Sandbox & Test Suite Runner (`backend/sandbox`)

The sandbox layer executes untrusted student submissions against test cases safely.

### 4.1. Sandbox Runner
**File**: [backend/sandbox/sandbox_runner.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/sandbox_runner.py)

- **`_truncate_output(text: str, max_bytes: int = 65536) -> str`** (Line 14)
  - **Purpose**: Truncates stdout/stderr to prevent denial-of-service via infinite print loops.
- **`_extract_java_class_name(source: str) -> str`** (Line 22)
  - **Purpose**: Uses regex to extract the `public class <Name>` identifier, defaulting to `Main`.
- **`_is_docker_available() -> bool`** (Line 29)
  - **Purpose**: Probes `docker info` to verify if Docker daemon is accessible.
- **`_prepare_python_script(source: str, stdin_input: str) -> str`** (Line 43)
  - **Purpose**: Creates an execution harness around student Python code that handles safe stdin parsing and auto-invokes top-level solution functions with arguments.
- **`_execute_in_docker_container(source: str, language: str, timeout_seconds: int, stdin_input: str) -> dict`** (Line 102)
  - **Purpose**: Mounts code into an isolated container running with `--net=none`, `--memory=256m`, and `--cpus=1.0`.
- **`_execute_in_host_process(source: str, language: str, timeout_seconds: int, stdin_input: str) -> dict`** (Line 192)
  - **Purpose**: Fallback runner executing in a localized temporary directory using `subprocess.Popen` with process group termination on timeout. Handles compiling and executing Python, C (`gcc`/`clang`), and Java (`javac`/`java`).
- **`execute_in_sandbox(source: str, language: str, metadata: dict = None, timeout_seconds: int = 10, stdin_input: str = "", force_host: bool = False) -> dict`** (Line 387)
  - **Purpose**: Unified entrypoint routing code execution to Docker or Host fallback.

---

### 4.2. Test Suite Runner
**File**: [backend/sandbox/test_suite_runner.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/sandbox/test_suite_runner.py)

- **`_normalize_text(text: str) -> str`** (Line 6)
  - **Purpose**: Normalizes CRLF line endings to `\n`, strips trailing whitespace per line, and removes outer whitespace for consistent test assertions.
- **`run_test_suite_against_code(submission_id: int, source: str, language: str, test_cases: List[Any]) -> SandboxResults`** (Line 14)
  - **Purpose**: Iterates over all active `TestCase` records, sends inputs to the sandbox, compares actual output with expected output, and aggregates results. Implements compilation error short-circuiting to halt subsequent tests if the build fails.

---

## 5. Multi-Agent AI Assessment Subsystem (`backend/agents`)

The multi-agent system provides deterministic assessment, Socratic mentoring, Big-O optimization, oral viva question selection, and plagiarism checking.

### 5.1. Assessment Agent
**File**: [backend/agents/assessment_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/assessment_agent.py)

- **`class AssessmentEngine`** (Line 31)
  - **`calculate_correctness_score(sandbox_results: SandboxResults) -> float`** (Line 62): Computes percentage of passing test cases ($0.0$ to $100.0$).
  - **`calculate_standards_score(diagnostics: List[Diagnostic]) -> float`** (Line 82): Penalizes score from 100 based on errors ($-5$), warnings ($-2$), info ($-0.5$), and high CC ($-2$).
  - **`calculate_efficiency_score(cyclomatic_complexity: float, maintainability_index: float) -> float`** (Line 105): 50/50 weighted combination of Cyclomatic Complexity band and Maintainability Index.
  - **`derive_recommendation(correctness_score: float, standards_score: float, efficiency_score: float) -> str`** (Line 139): Maps composite score to `excellent`, `good`, `fair`, or `needs_improvement`.
  - **`extract_failed_tests(sandbox_results: SandboxResults) -> List[FailedTestCase]`** (Line 165): Formats failed test inputs, actual outputs, and expected outputs.
  - **`extract_flagged_issues(diagnostics: List[Diagnostic], cyclomatic_complexity: float, failed_tests: List[FailedTestCase]) -> List[FlaggedIssue]`** (Line 195): Consolidates static diagnostics, runtime failures, and complexity alerts.
- **`class JustificationGenerator`** (Line 242)
  - **`__init__(self, llm_client: LLMClient = None)`** (Line 245)
  - **`generate(self, language, correctness_score, standards_score, efficiency_score, passed_tests, total_tests, failed_tests, flagged_issues, overall_recommendation) -> str`** (Line 248): Requests LLM to generate an evaluative narrative, falling back to a deterministic template if the LLM is unavailable.
- **`assessment_agent(parsed_submission: ParsedSubmission, sandbox_results: SandboxResults, llm_client: LLMClient = None) -> AssessmentReport`** (Line 339)
  - **Purpose**: Top-level function combining deterministic scoring with justification generation.

---

### 5.2. Socratic Mentor Agent
**File**: [backend/agents/mentor_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/mentor_agent.py)

- **`class MentorEngine`** (Line 60)
  - **`categorize_failure(failed_test: FailedTestCase, parsed_submission: ParsedSubmission) -> str`** (Line 64): Classifies failure into `boundary_conditions`, `logic_error`, `performance_issue`, `style_issue`, or `complexity`.
  - **`generate_socratic_hints(failed_tests, flagged_issues, correctness_score, parsed_submission) -> List[MentorHint]`** (Line 81): Produces pedagogical guiding questions **without direct code fixes**.
  - **`derive_suggested_reading(flagged_issues, complexity) -> List[str]`** (Line 135): Suggests relevant computer science topics based on student errors.
  - **`detect_concepts(parsed_submission) -> List[DetectedConcept]`** (Line 179): Uses AST evidence to identify programming constructs (loops, recursion, list comprehensions, classes, dictionaries).
- **`class MentorJustificationGenerator`** (Line 204)
  - **`__init__(self, llm_client: LLMClient = None)`** (Line 207)
  - **`generate(self, language, correctness_score, is_perfect, hints, failed_tests_count) -> str`** (Line 210): Generates growth-mindset encouraging narrative.
- **`mentor_agent(parsed_submission: ParsedSubmission, assessment_report: AssessmentReport = None, llm_client: LLMClient = None) -> MentorReport`** (Line 257)
  - **Purpose**: Top-level function producing the Socratic mentoring report.

---

### 5.3. Optimization Agent
**File**: [backend/agents/optimization_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/optimization_agent.py)

- **`class OptimizationEngine`** (Line 23)
  - **`estimate_time_complexity(source: str, ast_summary: ASTSummary) -> str`** (Line 27): Inspects loop nesting levels to estimate $O(1)$, $O(n)$, $O(n^2)$, or $O(n^3)$ complexity.
  - **`estimate_space_complexity(source: str, language: str) -> str`** (Line 52): Detects collections and dynamic allocations ($O(1)$ vs $O(n)$).
  - **`detect_findings(parsed_submission: ParsedSubmission) -> List[OptimizationFinding]`** (Line 60): Identifies specific lines containing nested loops, quadratic string concatenation (`+=` in loops), or redundant lookups.
- **`class OptimizationJustificationGenerator`** (Line 113)
  - **`__init__(self, llm_client: LLMClient = None)`** (Line 116)
  - **`generate(self, language, time_comp, space_comp, findings) -> str`** (Line 119): Uses LLM to explain algorithmic trade-offs.
- **`optimization_agent(parsed_submission: ParsedSubmission, llm_client: LLMClient = None) -> OptimizationReport`** (Line 161)
  - **Purpose**: Top-level function returning Big-O complexities and code findings.

---

### 5.4. Viva Agent
**File**: [backend/agents/viva_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/viva_agent.py)

- **`viva_question_agent(title: str, description: str, language: str, llm_client: LLMClient = None) -> List[dict]`** (Line 20)
  - **Purpose**: Invoked during assignment creation. Generates 3–5 candidate conceptual oral examination questions with expected concepts and grading rubrics.
- **`viva_agent(parsed_submission: ParsedSubmission, approved_viva_bank: List[dict] = None) -> VivaReport`** (Line 78)
  - **Purpose**: Invoked during student submission. Inspects the student's code (recursion, complexity, loops) and selects/personalizes the most relevant viva questions from the assignment's approved question bank.

---

### 5.5. Academic Integrity Agent
**File**: [backend/agents/integrity_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/integrity_agent.py)

- **`_calculate_jaccard_similarity(set_a: set, set_b: set) -> float`** (Line 8)
  - **Purpose**: Calculates Jaccard similarity coefficient: $\frac{|A \cap B|}{|A \cup B|} \times 100$.
- **`_detect_refactoring(target_norm, hist_norm, target_source, hist_source, sim_score) -> List[RefactoringPattern]`** (Line 19)
  - **Purpose**: Detects variable renaming (high AST token similarity despite different identifier names) and structural control-flow isomorphism.
- **`integrity_agent(parsed_submission: ParsedSubmission, historical_submissions: List[dict] = None, llm_client: LLMClient = None) -> IntegrityReport`** (Line 50)
  - **Purpose**: Compares current code k-grams against all prior assignment submissions and outputs similarity scores, matched submission IDs, and risk levels (`low`, `moderate`, `high`).

---

### 5.6. TestCase Agent
**File**: [backend/agents/testcase_agent.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/testcase_agent.py)

- **`generate_draft_tests(title: str, description: str, language: str, llm_client: LLMClient = None) -> List[dict]`** (Line 9)
  - **Purpose**: Generates 3–4 draft test cases (standard inputs, edge cases, boundaries) for a newly authored question.

---

### 5.7. Faculty Intelligence Engine
**File**: [backend/agents/faculty_intelligence.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/agents/faculty_intelligence.py)

- **`generate_faculty_intelligence(assignment_id: int, db: Session) -> dict`** (Line 7)
  - **Purpose**: Queries all submissions and reports for a given assignment. Computes average scores, grade distribution breakdown, roster with override statuses, and mines the top 5 recurring class misconceptions with percentages.

---

## 6. Pipeline Orchestrator (`backend/orchestrator`)

Coordinates multi-agent execution safely and asynchronously.

**File**: [backend/orchestrator/orchestrator.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/orchestrator/orchestrator.py)

- **`async def _run_agent_safe(agent_name: str, agent_func, *args, **kwargs) -> AgentOutput`** (Line 15)
  - **Purpose**: Wraps individual agent executions in a try/except block. Returns a fallback `AgentOutput` if an agent throws an exception, preventing individual agent errors from aborting the pipeline.
- **`async def run_assessment_pipeline(parsed_submission: ParsedSubmission, sandbox_results: SandboxResults = None, approved_viva_bank: List[dict] = None, historical_submissions: List[dict] = None) -> dict`** (Line 37)
  - **Purpose**: 
    1. Runs `assessment_agent` sequentially to establish baseline scores and failed test issues.
    2. Runs `mentor_agent`, `optimization_agent`, `viva_agent`, and `integrity_agent` concurrently via `asyncio.gather`.
    3. Assembles and returns the consolidated JSON report.

---

## 7. Core Infrastructure & LLM Routing Engine (`backend/core`)

Houses shared utilities, tokenization, authentication, and multi-provider LLM integrations.

### 7.1. AST Normalizer
**File**: [backend/core/ast_normalizer.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/ast_normalizer.py)

- **`_python_canonical_ast_tokens(source: str) -> List[str]`** (Line 6): Strips variable names, literals, docstrings, and comments to produce canonical AST token streams.
- **`_fallback_structural_tokens(source: str) -> List[str]`** (Line 26): Tokenizes non-Python source into structural keywords and operators.
- **`generate_k_grams(tokens: List[str], k: int = 4) -> List[int]`** (Line 57): Produces 4-gram rolling hashes for AST winnowing.
- **`normalize_ast(source: str, language: str = "python") -> dict`** (Line 71): Returns canonical tokens, hashes, SHA256 fingerprint, and total token count.

---

### 7.2. Multi-Provider LLM Client
**File**: [backend/core/llm_client.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/llm_client.py)

- **`_extract_json_from_text(text: str) -> dict`** (Line 55): Robust JSON extractor that strips markdown fences and extracts raw JSON objects.
- **`class LLMClient`** (Line 88)
  - **`__init__(self, provider: str = None, model: str = None, api_key: str = None)`** (Line 89)
  - **`_resolve_provider_candidates(self) -> List[dict]`** (Line 99): Builds a failover cascade of available providers (Groq, Together, Fireworks, OpenAI) based on present environment keys.
  - **`generate(self, prompt: str, context: dict = None, system_prompt: str = None, json_mode: bool = False) -> dict`** (Line 135): Sends request to primary provider; cascades through fallback providers on error.
  - **`health_check(self) -> dict`** (Line 211): Verifies API connectivity.
- **`get_agent_llm_client(agent_name: str) -> LLMClient`** (Line 221): Factory returning an `LLMClient` configured with per-agent model or provider overrides.

---

### 7.3. Authentication & Configuration
- **`create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str`** — [backend/core/auth.py:L11](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/auth.py#L11)
- **`verify_access_token(token: str) -> Optional[dict]`** — [backend/core/auth.py:L18](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/auth.py#L18)
- **`class Settings(BaseSettings)`** — [backend/core/config.py:L6](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/core/config.py#L6): Loads environment variables from `.env`.

---

## 8. Database Layer & Models (`backend/db`)

Database ORM definitions and connection lifecycle.

### 8.1. SQLAlchemy Models
**File**: [backend/db/models.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/db/models.py)

- **`class User(Base)`** (Line 7): Represents users (`id`, `email`, `hashed_password`, `role`).
- **`class Assignment(Base)`** (Line 19): Represents questions (`id`, `title`, `description`, `language`, `is_approved`, `draft_tests`, `draft_viva`).
- **`class TestCase(Base)`** (Line 37): Approved test cases (`id`, `assignment_id`, `input_data`, `expected_output`, `active`).
- **`class VivaQuestion(Base)`** (Line 50): Approved viva questions (`id`, `assignment_id`, `prompt`, `expected_concepts`).
- **`class Submission(Base)`** (Line 62): Student submissions (`id`, `assignment_id`, `user_id`, `source_code`, `status`, `faculty_score`, `final_grade`, `faculty_notes`).
- **`class Report(Base)`** (Line 82): Aggregated evaluation report (`id`, `submission_id`, `aggregated_output`).

---

### 8.2. Session & Initialization
**File**: [backend/db/session.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/db/session.py)

- **`_apply_db_migrations(engine)`** (Line 8): Applies Alembic migrations or schema creation.
- **`_seed_initial_data(engine)`** (Line 23): Seeds default `student101@codementor.edu` and `faculty@codementor.edu` accounts.
- **`init_db(database_url: str = None)`** (Line 61): Connects to PostgreSQL, with automatic fallback to local SQLite (`codementor.db`) if PostgreSQL is unavailable.
- **`get_db() -> Generator[Session, None, None]`** (Line 88): FastAPI dependency yielding database sessions.

---

## 9. API Routes, Endpoints & Application Root (`backend/api` & `backend/main.py`)

### 9.1. Route Handlers
**File**: [backend/api/routes.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/api/routes.py)

| Function | Endpoint | HTTP Method | Line | Description |
| :--- | :--- | :---: | :---: | :--- |
| **`get_questions`** | `/api/questions` | `GET` | Line 18 | Lists all assignments in the system |
| **`get_question`** | `/api/questions/{question_id}` | `GET` | Line 24 | Retrieves an assignment by ID |
| **`create_question`** | `/api/questions` | `POST` | Line 32 | Creates question; invokes TestCase Agent & Viva Agent to generate drafts |
| **`update_question`** | `/api/questions/{question_id}` | `PUT` | Line 55 | Updates title, description, language, or draft tests/viva |
| **`approve_question`** | `/api/questions/{question_id}/approve` | `POST` | Line 69 | Approves assignment; commits draft tests into active `TestCase` records |
| **`submit_code`** | `/api/submissions` | `POST` | Line 94 | Parses code, runs sandbox test suite, triggers multi-agent pipeline, saves report |
| **`submission_status`** | `/api/submissions/{submission_id}/status` | `GET` | Line 172 | Polls submission status and fetches aggregated agent output |
| **`get_report`** | `/api/reports/{report_id}` | `GET` | Line 183 | Fetches full assessment report by ID |
| **`get_faculty_intelligence`** | `/api/questions/{question_id}/intelligence` | `GET` | Line 194 | Class score averages, misconception mining, student submission roster |
| **`override_submission_grade`** | `/api/submissions/{submission_id}/override` | `POST` | Line 202 | Updates instructor score, letter grade, and pedagogical notes |
| **`get_analytics`** | `/api/analytics` | `GET` | Line 221 | Returns global counts (assignments, submissions, approved questions) |
| **`delete_question`** | `/api/questions/{question_id}` | `DELETE` | Line 236 | Deletes an assignment with cascading removal of tests, submissions, and reports |
| **`delete_submission`** | `/api/submissions/{submission_id}` | `DELETE` | Line 255 | Deletes an individual submission and its report |
| **`reset_all_data`** | `/api/reset-data` | `POST` | Line 266 | Wipes all dynamic assignments and submissions; re-seeds default users |
| **`parse_submission`** | `/api/parse` | `POST` | Line 277 | Standalone endpoint to run language adapters on raw source code |

---

### 9.2. Application Entrypoint
**File**: [backend/main.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/main.py)

- **`startup_event()`** (Line 31): Invokes `init_db()` on application launch.
- **`root()`** (Line 36): Serves frontend single-page application `index.html` or API status check.

---

## 10. Database Migrations (`alembic`)

- **File**: [alembic/env.py](file:///d:/mca_mini_vijil/CodeMentor_AI/alembic/env.py)
  - **`run_migrations_offline()`** (Line 24): Runs migrations without an active database engine using SQL generation.
  - **`run_migrations_online()`** (Line 38): Connects to the database and executes schema migrations.
- **File**: [alembic/versions/001_initial_schema.py](file:///d:/mca_mini_vijil/CodeMentor_AI/alembic/versions/001_initial_schema.py)
  - **`upgrade()`** (Line 19): Creates `users`, `assignments`, `test_cases`, `viva_questions`, `submissions`, and `reports` tables.
  - **`downgrade()`** (Line 91): Drops all tables in reverse order.

---

## 11. Management & Verification Scripts (`backend/` & Root)

### 11.1. Standalone Python Scripts
- **File**: [backend/reset_db.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/reset_db.py)
  - **`reset_database()`** (Line 16): Drops all tables, calls `Base.metadata.create_all`, and re-seeds default user credentials.
- **File**: [backend/test_live_system.py](file:///d:/mca_mini_vijil/CodeMentor_AI/backend/test_live_system.py)
  - **`run_live_test()`** (Line 23): Complete integration test that creates a question, approves it, submits code, verifies sandbox execution, and asserts multi-agent report generation.

### 11.2. Shell & Startup Scripts
- **File**: [run.ps1](file:///d:/mca_mini_vijil/CodeMentor_AI/run.ps1) (Windows) & [run.sh](file:///d:/mca_mini_vijil/CodeMentor_AI/run.sh) (Linux/macOS)
  - Detects Python, Node.js, and Docker availability.
  - Starts backend (:8000), student portal (:5173), and faculty dashboard (:5174) with terminal logging.
- **File**: [reset_data.ps1](file:///d:/mca_mini_vijil/CodeMentor_AI/reset_data.ps1) (Windows) & [reset_data.sh](file:///d:/mca_mini_vijil/CodeMentor_AI/reset_data.sh) (Linux/macOS)
  - Invokes `POST /api/reset-data` or executes `backend/reset_db.py` to reset the database.

---

## 12. Frontend Applications & Handlers (`frontend/`)

Both frontend applications are built using React 18, Vite, and Lucide React icons.

### 12.1. Student Portal (`frontend/student-portal/src/App.jsx`)
**File**: [frontend/student-portal/src/App.jsx](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/student-portal/src/App.jsx)

- **`App()`** (Line 52): Main student portal component.
- **Key Functions & Handlers**:
  - **`handleRoleTabChange(role)`** (Line 90): Switches user perspective between student and faculty.
  - **`fetchAnalytics()`** (Line 101): Fetches global assignment/submission counts.
  - **`fetchIntelligence(qId)`** (Line 113): Loads class analytics for a question.
  - **`handleOverrideSubmit(subId)`** (Line 125): Submits instructor grade override and notes.
  - **`fetchQuestions()`** (Line 150): Loads list of approved student programming assignments.
  - **`handleSelectQuestion(qId)`** (Line 179): Selects active question and populates language starter code template.
  - **`handleLoginSubmit(e)`** (Line 204): Authenticates user credentials.
  - **`handleLogout()`** (Line 223): Clears authentication state.
  - **`handleLanguageChange(lang)`** (Line 230): Updates Monaco editor language mode (`python`, `c`, `java`).
  - **`handleStudentSubmit()`** (Line 235): Submits code to `POST /api/submissions` and renders the 6-tab diagnostic evaluation dashboard.
  - **`handleCreateQuestion(e)`** (Line 277): Faculty question authoring modal handler.
  - **`handleApprove()`** (Line 301): Approves draft assignment.

---

### 12.2. Faculty Dashboard (`frontend/faculty-dashboard/src/App.jsx`)
**File**: [frontend/faculty-dashboard/src/App.jsx](file:///d:/mca_mini_vijil/CodeMentor_AI/frontend/faculty-dashboard/src/App.jsx)

- **`App()`** (Line 51): Main faculty dashboard component.
- **Key Functions & Handlers**:
  - **`handleRoleTabChange(role)`** (Line 81): Switches interface tabs.
  - **`fetchAnalytics()`** (Line 92): Refreshes dashboard statistics.
  - **`fetchIntelligence(qId)`** (Line 104): Queries `GET /api/questions/{id}/intelligence` to display class score distributions and top 5 misconceptions.
  - **`handleOverrideSubmit(subId)`** (Line 116): Saves manual grade override, score, and notes.
  - **`handleLoginSubmit(e)`** (Line 144): Processes faculty authentication.
  - **`handleLogout()`** (Line 163): Resets session state.
  - **`handleLanguageChange(lang)`** (Line 170): Updates code template language.
  - **`handleStudentSubmit()`** (Line 175): Direct submission test runner.
  - **`handleCreateQuestion(e)`** (Line 217): Sends `POST /api/questions` to trigger automated test case and viva generation.
  - **`handleApprove()`** (Line 241): Promotes draft question to student roster.
  - **`handleResetAllData()`** (Line 260): Calls `POST /api/reset-data` to wipe and re-seed system records.

---

## 13. Test Suite Function & Class Catalog

The backend test suite contains **90/90 passing tests** across 13 test files:

### 13.1. Language Adapters (`backend/adapters/test_adapters.py`)
- `test_python_adapter_valid_code` (Line 5)
- `test_python_adapter_syntax_error` (Line 22)
- `test_java_adapter_valid_code` (Line 29)
- `test_java_adapter_snippet_fallback` (Line 51)
- `test_java_adapter_syntax_error` (Line 67)
- `test_c_adapter_valid_code` (Line 74)
- `test_c_adapter_static_warnings` (Line 95)
- `test_c_adapter_syntax_error` (Line 112)

### 13.2. Assessment Agent (`backend/agents/test_assessment_agent.py`)
- **`TestCorrectnessScore`** (Line 184): `test_all_pass_100`, `test_no_tests_0`, `test_one_third_pass_33`, `test_deterministic_same_input_same_score`, `test_timeout_counts_as_fail`.
- **`TestStandardsScore`** (Line 219): `test_no_diagnostics_100`, `test_error_penalty_5`, `test_warning_penalty_2`, `test_info_penalty_half`, `test_combined_penalties`, `test_score_floor_zero`, `test_deterministic`.
- **`TestEfficiencyScore`** (Line 278): `test_cc_low_mi_high_100`, `test_cc_high_mi_low_0`, `test_cc_band_5_or_less`, `test_cc_band_6_to_10`, `test_cc_band_11_to_15`, `test_cc_band_16_to_20`, `test_cc_band_above_20`, `test_missing_cc_defaults_to_50`, `test_missing_mi_defaults_to_50`, `test_deterministic`.
- **`TestRecommendation`** (Line 365): `test_excellent_threshold_90`, `test_good_threshold_75`, `test_fair_threshold_60`, `test_needs_improvement_below_60`, `test_deterministic`.
- **`TestIssueExtraction`** (Line 403): `test_extract_diagnostics`, `test_extract_high_cc_warning`, `test_no_cc_warning_if_low`, `test_extract_failed_tests`.
- **`TestFullAssessment`** (Line 447): `test_assessment_passing_code`, `test_assessment_failing_code`, `test_output_structure`.
- **`TestLLMIntegration`** (Line 501): `test_llm_called_with_context`, `test_llm_fallback_on_error`.
- **`TestEdgeCases`** (Line 537): `test_empty_test_results`, `test_exact_threshold_at_75`, `test_exact_threshold_at_90`, `test_no_failed_tests_list_empty`.

### 13.3. Socratic Mentor Agent (`backend/agents/test_mentor_agent.py`)
- **`TestPerfectSubmissionPath`** (Line 176): `test_perfect_submission_generates_empty_hints`, `test_perfect_submission_generates_positive_encouragement`, `test_perfect_submission_fallback_text`.
- **`TestFailingSubmissionPath`** (Line 199): `test_failing_submission_generates_hints`, `test_hints_are_socratic_and_contain_no_code`, `test_hints_deduplicate_same_topic`, `test_hints_limited_to_max_five`, `test_suggested_reading_derivation`.
- **`TestLLMFallbackPath`** (Line 250): `test_llm_error_uses_deterministic_fallback`.
- **`TestMissingAssessmentReport`** (Line 265): `test_handles_missing_assessment_report_gracefully`.

### 13.4. Optimization, Viva & TestCase Agents (`backend/agents/test_phase3_agents.py`)
- **`TestOptimizationAgent`** (Line 110): `test_optimization_agent_nested_loop_detection`, `test_optimization_agent_linear_complexity`, `test_optimization_agent_llm_fallback`.
- **`TestVivaAgent`** (Line 138): `test_viva_question_agent_setup_generation`, `test_viva_agent_submission_selection`, `test_viva_agent_fallback_empty_bank`.

### 13.5. Academic Integrity Agent (`backend/agents/test_integrity_agent.py`)
- `create_mock_parsed_submission` (Line 8)
- `test_ast_normalization` (Line 34)
- `test_integrity_agent_renamed_variables` (Line 49)
- `test_integrity_agent_distinct_code` (Line 82)

### 13.6. Orchestrator Pipeline (`backend/orchestrator/test_orchestrator.py`)
- `test_run_assessment_pipeline_all_succeed` (Line 61)
- `test_run_assessment_pipeline_one_agent_fails` (Line 77)
- `test_run_assessment_pipeline_multiple_agent_failures` (Line 110)
- `test_run_assessment_pipeline_default_sandbox_results` (Line 138)

### 13.7. Sandbox Runner (`backend/sandbox/test_sandbox.py`)
- `test_python_sandbox_success` (Line 6)
- `test_python_sandbox_runtime_error` (Line 15)
- `test_python_sandbox_timeout` (Line 23)
- `test_c_sandbox` (Line 30)
- `test_java_sandbox` (Line 48)

### 13.8. Test Suite Runner (`backend/sandbox/test_testsuite_runner.py`)
- `test_normalize_text` (Line 5)
- `test_run_test_suite_success` (Line 10)
- `test_run_test_suite_partial_failure` (Line 31)

### 13.9. LLM Client & Failover (`backend/core/test_llm_client.py`)
- `test_extract_json_from_text_formats` (Line 7)
- `test_llm_client_fallback_mode` (Line 24)
- `test_llm_client_provider_resolution` (Line 32)
- `test_llm_client_provider_failover` (Line 41)
- `test_get_agent_llm_client_resolution` (Line 54)

### 13.10. Database Readiness (`backend/db/test_db_readiness.py`)
- `test_init_db_postgres_fallback_to_sqlite` (Line 6)
- `test_database_models_metadata_completeness` (Line 17)
- `test_alembic_config_imports` (Line 28)

### 13.11. Question Authoring & Viva Flow (`backend/api/test_question_flow.py`)
- `test_testcase_agent_question_setup` (Line 16)
- `test_viva_question_agent_setup` (Line 27)
- `test_viva_agent_submission_time_selection` (Line 37)

### 13.12. Faculty Intelligence & Override Flow (`backend/api/test_faculty_intelligence.py`)
- `test_faculty_intelligence_and_override_flow` (Line 11)

### 13.13. Delete & Reset API Endpoints (`backend/api/test_delete_and_reset_endpoints.py`)
- `test_delete_question_and_reset_endpoints` (Line 12)
