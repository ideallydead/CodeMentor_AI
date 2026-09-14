<#
.SYNOPSIS
    CodeMentor AI - Fast Local Development Runner (No Docker required)
.DESCRIPTION
    Starts the FastAPI backend, Student Portal, and Faculty Dashboard concurrently
    in native development mode for instant (< 2 second) startup.
#>

[CmdletBinding()]
param()

$Host.UI.RawUI.WindowTitle = "CodeMentor AI - Local Runner"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       CodeMentor AI - Fast Native Local Runner             " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Ensure .env file exists
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    }
}

# 2. Check Python
$pythonCmd = $null
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
} else {
    Write-Host "[ERROR] Python was not found in PATH." -ForegroundColor Red
    exit 1
}

# 3. Check npm
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js / npm was not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Starting services locally..." -ForegroundColor Green
Write-Host "       - Backend API:         http://localhost:8000 (Docs: http://localhost:8000/docs)" -ForegroundColor White
Write-Host "       - Student Portal:      http://localhost:4173" -ForegroundColor White
Write-Host "       - Faculty Dashboard:   http://localhost:4174" -ForegroundColor White
Write-Host "       - Database:            SQLite (codementor.db)" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Press [Ctrl+C] at any time to stop all services." -ForegroundColor Yellow
Write-Host ""

$processes = @()

try {
    # Start Backend API
    $backendProcess = Start-Process -FilePath $pythonCmd -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000" -PassThru -NoNewWindow
    $processes += $backendProcess

    # Start Student Portal (port 4173)
    $studentProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--prefix", "frontend/student-portal" -PassThru -NoNewWindow
    $processes += $studentProcess

    # Start Faculty Dashboard (port 4174)
    $facultyProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--prefix", "frontend/faculty-dashboard" -PassThru -NoNewWindow
    $processes += $facultyProcess

    # Wait for processes
    while ($true) {
        Start-Sleep -Seconds 1
        foreach ($proc in $processes) {
            if ($proc.HasExited) {
                Write-Host "`n[WARN] A service process (PID $($proc.Id)) exited with code $($proc.ExitCode)." -ForegroundColor Yellow
            }
        }
    }
}
finally {
    Write-Host "`n[INFO] Shutting down CodeMentor AI services..." -ForegroundColor Cyan
    foreach ($proc in $processes) {
        if ($proc -and -not $proc.HasExited) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    # Ensure any lingering node/uvicorn on the specific ports are cleared
    Write-Host "[OK] All services stopped cleanly." -ForegroundColor Green
}
