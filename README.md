# CodeMentor AI: A Multi-Agent AI Framework for Automated Programming Assessment and Personalized Educational Feedback

> **Author**: Vijil Raj (TCR25MCA-2057, GEC Thrissur)  
> **Tech Stack**: FastAPI (Python 3.10+), React (JS ES6+), PostgreSQL / SQLite, Docker Container Sandbox, Multi-Agent LLM Infrastructure (Together AI / Fireworks AI / Groq serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama).

---

## Quick Start Guide

Full instructions are available in [RUNNING_INSTRUCTIONS.md](file:///d:/mca_mini_vijil/CodeMentor_AI/RUNNING_INSTRUCTIONS.md).

### 1. Environment Configuration

Copy `.env.example` to `.env` and set your preferred parameters or API keys:

```bash
cp .env.example .env
```

### 2. Run the Backend API Server

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`

### 3. Run the Frontend Applications

#### Student Portal

```bash
cd frontend/student-portal
npm install
npm run dev
```

#### Faculty Dashboard

```bash
cd frontend/faculty-dashboard
npm install
npm run dev
```

### 4. Run Every Component as Containers (Single Command)

Run every part of this project (PostgreSQL + FastAPI Backend + Docker Sandbox + Student Portal + Faculty Dashboard) using a single command:

**On Windows (PowerShell):**
```powershell
.\run.ps1
```

**On Linux / Mac / Git Bash:**
```bash
./run.sh
```

**Direct Docker Compose Command (Any Platform):**
```bash
docker compose up --build
```

**Exposed Endpoints:**
- **FastAPI Backend**: `http://localhost:8000` (Swagger: `http://localhost:8000/docs`)
- **Student Portal**: `http://localhost:4173`
- **Faculty Dashboard**: `http://localhost:4174`
- **PostgreSQL Database**: `localhost:5432`

### 5. Run the Test Suite (90/90 Passed)

```bash
python -m pytest
```

---

For detailed module completion verification and presentation compliance, see [REMAINING_WORK.md](file:///d:/mca_mini_vijil/CodeMentor_AI/REMAINING_WORK.md).
