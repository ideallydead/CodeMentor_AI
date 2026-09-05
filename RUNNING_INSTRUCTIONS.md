# CodeMentor AI - Running & Setup Instructions

> **Project Title**: CODEMENTOR AI: A Multi-Agent AI Framework for Automated Programming Assessment and Personalized Educational Feedback  
> **Author**: Vijil Raj (TCR25MCA-2057, GEC Thrissur)  
> **Tech Stack**: FastAPI (Python 3.10+), React (JS ES6+), PostgreSQL / SQLite, Docker Container Sandbox, Multi-Agent LLM Infrastructure (Together AI / Fireworks AI / Groq serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama).

---

## 📋 Prerequisites

Before running CodeMentor AI, ensure you have the following installed on your system:

- **Python**: Version `3.10+` (Python 3.10, 3.11, 3.12, 3.14 supported)
- **Node.js & npm**: Node.js `v18+` and `npm`
- **Compilers / Runtimes (for host sandbox execution)**:
  - Python (built-in)
  - `gcc` or `clang` (optional, for C language code sandbox evaluation)
  - `javac` and `java` (optional, for Java language code sandbox evaluation)
- **Docker & Docker Compose** (Optional, for containerized production setup)

---

## ⚙️ Environment Configuration

1. **Create/Verify `.env` File**:
   In the root directory of `CodeMentor_AI`, copy `.env.example` to `.env` or create `.env`:

   ```env
   # Database Connection (PostgreSQL or fallback SQLite)
   DATABASE_URL=sqlite:///./codementor.db
   # For PostgreSQL:
   # DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/codementor

   # Authentication Security
   JWT_SECRET=test-secret-key-for-development

   # Cloud LLM Multi-Provider Routing
   LLM_PROVIDER=groq
   LLM_MODEL=deepseek-coder

   # API Keys for Cloud LLM Providers (Groq, Together AI, Fireworks AI)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   TOGETHER_API_KEY=your_together_api_key_here
   FIREWORKS_API_KEY=your_fireworks_api_key_here

   # Execution Timeout Settings (seconds)
   SANDBOX_TIMEOUT_SECONDS=10
   ```

---

## 🚀 Running locally (Development Mode)

### Step 1: Install Backend Dependencies

Open a terminal in the project root:

```bash
# Navigate to project root
cd CodeMentor_AI

# Install Python requirements
pip install -r backend/requirements.txt
```

### Step 2: Start the FastAPI Backend Server

Run Uvicorn from the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

- **Backend API URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc API Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 3: Run the Frontends

CodeMentor AI includes two React applications powered by Vite:

#### 1. Student Portal (`frontend/student-portal`)

```bash
cd frontend/student-portal
npm install
npm run dev
```
- **Student Portal URL**: [http://localhost:5173](http://localhost:5173) (or port output by Vite)

#### 2. Faculty Dashboard (`frontend/faculty-dashboard`)

Open a new terminal window:

```bash
cd frontend/faculty-dashboard
npm install
npm run dev
```
- **Faculty Dashboard URL**: [http://localhost:5174](http://localhost:5174) (or port output by Vite)

---

## 🐳 Running with Docker Containers (Singular Command)

To run the entire multi-container environment (PostgreSQL + FastAPI Backend + Docker Sandbox + Student Portal + Faculty Dashboard) in **one single command**:

**On Windows (PowerShell):**
```powershell
.\run.ps1
```

**On Linux / Mac / Git Bash:**
```bash
./run.sh
```

**Direct Docker Compose (Cross-Platform):**
```bash
docker compose up --build
```

**Services Exposed:**
- **FastAPI Backend**: `http://localhost:8000` (Swagger Docs: `http://localhost:8000/docs`)
- **Student Portal**: `http://localhost:4173`
- **Faculty Dashboard**: `http://localhost:4174`
- **PostgreSQL Database**: `localhost:5432`
- **Sandbox Engine**: Container isolated runner

To stop all containers:
```bash
docker compose down
```

---

## 🧪 Running Unit Tests & Verification Suite

### Run Complete Pytest Backend Suite (90/90 Tests)

Execute the full automated test suite covering all 6 modules (Adapters, Integrity Agent, Assessment Agent, Mentor Agent, Faculty Intelligence, Database Readiness, and Sandboxes):

```bash
python -m pytest
```

### Run Live System Verification Script

Verify live API endpoint routes, agent execution pipelines, and database interactions:

```bash
python backend/test_live_system.py
```

---

## 📁 Project Directory Structure

```text
CodeMentor_AI/
├── backend/
│   ├── adapters/          # C, Java & Python language adapters & AST parsers
│   ├── agents/            # Multi-agent LLM systems (Assessment, Integrity, Mentor, Viva, TestCase)
│   ├── api/               # FastAPI route endpoints & request handlers
│   ├── core/              # Config, LLM multi-provider client, Pydantic schemas
│   ├── db/                # SQLAlchemy database models, session management & Alembic migrations
│   ├── orchestrator/      # Multi-agent assessment pipeline orchestrator
│   ├── sandbox/           # Docker container & host process sandbox execution runners
│   ├── main.py            # FastAPI main application entry point
│   └── requirements.txt   # Python backend dependencies
├── frontend/
│   ├── student-portal/    # React Student UI (Submissions, Code Editor, Viva Chat)
│   └── faculty-dashboard/ # React Faculty UI (Misconceptions Analytics, Class Metrics, Overrides)
├── alembic/               # Database schema migration scripts
├── .env                   # Environment variables configuration
├── docker-compose.yml     # Multi-container production deployment definition
├── REMAINING_WORK.md      # Module completion & test verification status report
└── RUNNING_INSTRUCTIONS.md # Project setup and usage instructions
```
