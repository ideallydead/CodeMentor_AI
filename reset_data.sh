#!/usr/bin/env bash
set -e
x``
# CodeMentor AI - Database & Data Reset Utility for Linux / macOS / WSL
# Wipes all assignments, submissions, reports, test cases, and viva questions.

echo "============================================================"
echo "          CodeMentor AI - Data & Database Reset Utility     "
echo "============================================================"

FORCE=false
DOCKER=false

for arg in "$@"; do
    case $arg in
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--docker)
            DOCKER=true
            shift
            ;;
    esac
done

if [ "$FORCE" = false ]; then
    echo ""
    echo "[WARNING] This action will permanently delete:"
    echo "  - All Student Submissions"
    echo "  - All Evaluation & Feedback Reports"
    echo "  - All Assignment Test Cases & Viva Questions"
    echo "  - All Assignments (Questions)"
    echo ""
    echo "Default user accounts (faculty, student101) will be re-seeded."
    echo ""
    read -p "Are you sure you want to reset all data? (y/N): " -r CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo "[ABORTED] Reset cancelled by user."
        exit 0
    fi
fi

PYTHON_CMD="python"
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
fi

echo ""
echo "[1/2] Resetting local database tables using Python..."
$PYTHON_CMD -m backend.reset_db

if [ "$DOCKER" = true ]; then
    echo ""
    echo "[2/2] Resetting Docker PostgreSQL volume..."
    if command -v docker >/dev/null 2>&1; then
        echo "[INFO] Stopping containers and removing 'postgres_data' volume..."
        docker compose down -v || docker-compose down -v
        echo "[OK] Docker PostgreSQL volume cleared."
    else
        echo "[WARN] Docker command not found. Skipping Docker volume wipe."
    fi
else
    echo ""
    echo "[TIP] If you are using Docker containers, you can also run: ./reset_data.sh --docker"
fi

echo ""
echo "============================================================"
echo "         All Submissions and Assignments Removed!           "
echo "============================================================"
exit 0
