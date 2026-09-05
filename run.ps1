# CodeMentor AI - Container Launcher Script for Windows PowerShell
# Runs all components (PostgreSQL, Backend API, Sandbox Execution Engine, Student Portal, Faculty Dashboard) in Docker.

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          CodeMentor AI - Multi-Container Runner            " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Ensure .env exists
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[INFO] .env file not found. Creating from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "[WARN] Neither .env nor .env.example found. Continuing..." -ForegroundColor Yellow
    }
}

# Detect docker compose
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Starting all project services as containers..." -ForegroundColor Green
    Write-Host "       - PostgreSQL Database: localhost:5432"
    Write-Host "       - Backend API:         http://localhost:8000 (Swagger: http://localhost:8000/docs)"
    Write-Host "       - Student Portal UI:   http://localhost:4173"
    Write-Host "       - Faculty Dashboard:   http://localhost:4174"
    Write-Host "       - Sandbox Container:   Isolated execution engine"
    Write-Host "============================================================" -ForegroundColor Cyan
    
    if ($args.Count -gt 0) {
        docker compose up --build @args
    } else {
        docker compose up --build
    }
} else {
    Write-Host "[ERROR] 'docker' command was not found. Please ensure Docker Desktop for Windows is installed and running." -ForegroundColor Red
    exit 1
}
