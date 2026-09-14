# CodeMentor AI: A Multi-Agent AI Framework for Automated Programming Assessment and Personalized Educational Feedback

> **Author**: Vijil Raj (TCR25MCA-2057, GEC Thrissur)  
> **Tech Stack**: FastAPI (Python 3.10+), React (JS ES6+), PostgreSQL / SQLite, Docker Container Sandbox, Multi-Agent LLM Infrastructure (Together AI / Fireworks AI / Groq serving DeepSeek-Coder, Qwen2.5-Coder, Code Llama).

---

## Quick Start Guide

Full instructions are available in [RUNNING_INSTRUCTIONS.md](docs/guides/RUNNING_INSTRUCTIONS.md).

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

### 4. Fast Native Runner (No Docker Required - Starts in ~1-2s)

Run all services natively with SQLite and Vite concurrently in a single terminal:

**On Windows (PowerShell):**
```powershell
.\run-local.ps1
```

**On Linux / Mac / Git Bash:**
```bash
./run-local.sh
```

### 5. Multi-Container Runner (Docker Mode - Starts in ~3-5s)

Run all components as isolated Docker containers:

**On Windows (PowerShell):**
```powershell
.\run.ps1           # Fast start using existing images (~3-5s)
.\run.ps1 -Build    # Rebuild images when dependencies change
```

**On Linux / Mac / Git Bash:**
```bash
./run.sh            # Fast start using existing images (~3-5s)
./run.sh --build    # Rebuild images when dependencies change
```

**Direct Docker Compose Command:**
```bash
docker compose up
```

**Exposed Endpoints:**
- **FastAPI Backend**: `http://localhost:8000` (Swagger: `http://localhost:8000/docs`)
- **Student Portal**: `http://localhost:4173`
- **Faculty Dashboard**: `http://localhost:4174`
- **PostgreSQL Database**: `localhost:5432`

### 6. Run the Test Suite (95/95 Passed)

```bash
python -m pytest
```

---

## 📚 Project Documentation & Resources

All supplementary documentation, agent roadmaps, architecture guides, and academic assets are organized inside [`docs/`](docs/):

| Category | Location | Description |
| :--- | :--- | :--- |
| **System Architecture** | [`docs/architecture/`](docs/architecture/) | [System Modules & Architecture](docs/architecture/PROJECT_STRUCTURE_AND_MODULES.md), [File Structures & Functions](docs/architecture/FILE_STRUCTURE_AND_FUNCTIONS.md) |
| **Agent Design Plans** | [`docs/agent_plans/`](docs/agent_plans/) | [Assessment Agent Plan](docs/agent_plans/PLAN_ASSESSMENT_AGENT.md), [Mentor Agent Plan](docs/agent_plans/PLAN_MENTOR_AGENT.md), [Remaining Work / Checklist](docs/agent_plans/REMAINING_WORK.md) |
| **Setup & Guides** | [`docs/guides/`](docs/guides/) | [Comprehensive Running Instructions](docs/guides/RUNNING_INSTRUCTIONS.md) |
| **Presentation Assets** | [`docs/presentation/`](docs/presentation/) | Project Defense Slides ([PDF](docs/presentation/Vijil_mini_ppt.pdf), [ZIP Archive](docs/presentation/Vijil_mini_ppt.zip)) |

