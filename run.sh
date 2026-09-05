#!/usr/bin/env bash
set -e

# CodeMentor AI - Container Launcher Script
# Runs all components (PostgreSQL, Backend API, Sandbox Execution Engine, Student Portal, Faculty Dashboard) in Docker.

echo "============================================================"
echo "          CodeMentor AI - Multi-Container Runner            "
echo "============================================================"

# Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] .env file not found. Creating from .env.example..."
        cp .env.example .env
    else
        echo "[WARN] Neither .env nor .env.example found. Continuing..."
    fi
fi

# Detect docker compose executable
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "[ERROR] Neither 'docker compose' nor 'docker-compose' command was found."
    echo "Please ensure Docker & Docker Compose are installed and running."
    exit 1
fi

# Check Docker daemon socket permissions
if ! docker info >/dev/null 2>&1; then
    if [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
        echo "[INFO] Permission required for Docker daemon socket. Elevating command with sudo..."
        DOCKER_COMPOSE_CMD="sudo $DOCKER_COMPOSE_CMD"
    fi
fi

echo "[INFO] Starting all project services as containers..."
echo "       - PostgreSQL Database: localhost:5432"
echo "       - Backend API:         http://localhost:8000 (Swagger: http://localhost:8000/docs)"
echo "       - Student Portal UI:   http://localhost:4173"
echo "       - Faculty Dashboard:   http://localhost:4174"
echo "       - Sandbox Container:   Isolated execution engine"
echo "============================================================"

$DOCKER_COMPOSE_CMD up --build "$@"
