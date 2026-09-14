#!/usr/bin/env bash
# CodeMentor AI - Fast Local Development Runner (No Docker required)
# Starts FastAPI backend, Student Portal, and Faculty Dashboard concurrently in < 2 seconds.

set -e

echo "============================================================"
echo "       CodeMentor AI - Fast Native Local Runner             "
echo "============================================================"

# Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] Creating .env from .env.example..."
        cp .env.example .env
    fi
fi

# Check Python and npm
if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
    echo "[ERROR] Python was not found in PATH."
    exit 1
fi
PYTHON_BIN=$(command -v python3 || command -v python)

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm was not found in PATH."
    exit 1
fi

echo "[INFO] Starting services locally..."
echo "       - Backend API:         http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo "       - Student Portal:      http://localhost:4173"
echo "       - Faculty Dashboard:   http://localhost:4174"
echo "       - Database:            SQLite (codementor.db)"
echo "============================================================"
echo "Press [Ctrl+C] at any time to stop all services."
echo ""

# Cleanup trap on exit
cleanup() {
    echo ""
    echo "[INFO] Shutting down CodeMentor AI services..."
    kill $(jobs -p) 2>/dev/null || true
    echo "[OK] All services stopped cleanly."
}
trap cleanup EXIT INT TERM

# Start Backend API
$PYTHON_BIN -m uvicorn backend.main:app --reload --port 8000 &

# Start Student Portal (port 4173)
npm run dev --prefix frontend/student-portal &

# Start Faculty Dashboard (port 4174)
npm run dev --prefix frontend/faculty-dashboard &

# Wait for background jobs
wait
