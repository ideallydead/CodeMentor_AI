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

# Function to check and initialize Docker Desktop if not running
function Ensure-DockerRunning {
    # Check if Docker daemon is already responsive
    & docker info >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        return $true
    }

    Write-Host "[WARN] Docker daemon is not responding." -ForegroundColor Yellow

    # Check if Docker Desktop process is already running/starting up
    $dockerProcesses = Get-Process "*Docker Desktop*" -ErrorAction SilentlyContinue
    if (-not $dockerProcesses) {
        Write-Host "[INFO] Launching Docker Desktop..." -ForegroundColor Cyan

        $dockerPaths = @(
            "C:\Program Files\Docker\Docker\Docker Desktop.exe",
            "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
            "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
        )

        $dockerDesktopExe = $null
        foreach ($path in $dockerPaths) {
            if ($path -and (Test-Path $path)) {
                $dockerDesktopExe = $path
                break
            }
        }

        if (-not $dockerDesktopExe) {
            $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Docker Desktop.exe"
            if (Test-Path $regPath) {
                $dockerDesktopExe = (Get-ItemProperty $regPath).'(default)'
            }
        }

        if ($dockerDesktopExe -and (Test-Path $dockerDesktopExe)) {
            Start-Process -FilePath $dockerDesktopExe
        } else {
            try {
                Start-Process "Docker Desktop"
            } catch {
                Write-Host "[ERROR] Could not find 'Docker Desktop.exe'. Please launch Docker Desktop manually." -ForegroundColor Red
                return $false
            }
        }
    } else {
        Write-Host "[INFO] Docker Desktop is running in background. Waiting for engine to finish initializing..." -ForegroundColor Cyan
    }

    # Wait for Docker engine to become ready
    Write-Host "[INFO] Waiting for Docker daemon to become ready..." -ForegroundColor Yellow -NoNewline
    $timeoutSeconds = 90
    $elapsed = 0
    $interval = 3

    while ($elapsed -lt $timeoutSeconds) {
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        & docker info >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n[OK] Docker engine is ready!" -ForegroundColor Green
            return $true
        }
        Write-Host -NoNewline "."
    }

    Write-Host "`n[ERROR] Docker daemon did not respond within $timeoutSeconds seconds." -ForegroundColor Red
    Write-Host "        Please open Docker Desktop and check its status before retrying." -ForegroundColor Red
    return $false
}

# Detect docker CLI and ensure daemon is running
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    $dockerReady = Ensure-DockerRunning
    if (-not $dockerReady) {
        exit 1
    }

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
    Write-Host "[ERROR] 'docker' command was not found. Please ensure Docker Desktop for Windows is installed and added to PATH." -ForegroundColor Red
    exit 1
}
