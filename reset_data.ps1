<#
.SYNOPSIS
    CodeMentor AI - Database & Data Reset Utility for Windows PowerShell.

.DESCRIPTION
    Wipes all application data (assignments, student submissions, evaluation reports,
    test cases, viva questions) from the database in dependency order, vacuums SQLite,
    and re-seeds default development users (faculty and student101).
    Can also reset Docker PostgreSQL container volumes if requested.

.PARAMETER Force
    Skips the interactive confirmation prompt.

.PARAMETER Docker
    Also stops Docker containers and wipes the PostgreSQL data volume (docker compose down -v).

.EXAMPLE
    .\reset_data.ps1
    Prompts for confirmation before wiping local database data.

.EXAMPLE
    .\reset_data.ps1 -Force
    Immediately wipes local database data without interactive confirmation.

.EXAMPLE
    .\reset_data.ps1 -Docker
    Wipes local SQLite database and also resets Docker PostgreSQL volume.
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$Docker
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          CodeMentor AI - Data & Database Reset Utility     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Confirmation check
if (-not $Force) {
    Write-Host "`n[WARNING] This action will permanently delete:" -ForegroundColor Yellow
    Write-Host "  - All Student Submissions" -ForegroundColor Yellow
    Write-Host "  - All Evaluation & Feedback Reports" -ForegroundColor Yellow
    Write-Host "  - All Assignment Test Cases & Viva Questions" -ForegroundColor Yellow
    Write-Host "  - All Assignments (Questions)" -ForegroundColor Yellow

    Write-Host "`nDefault user accounts (faculty, student101) will be re-seeded." -ForegroundColor Cyan

    $confirm = Read-Host "`nAre you sure you want to reset all data? (y/N)"
    if ($confirm -notmatch "^[yY]([eE][sS])?$") {
        Write-Host "[ABORTED] Reset cancelled by user." -ForegroundColor Gray
        exit 0
    }
}

# 2. Locate Python executable (virtualenv or system python)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = Get-Location }

$pythonExe = $null
$candidatePaths = @(
    (Join-Path $scriptDir ".venv\Scripts\python.exe"),
    (Join-Path $scriptDir "venv\Scripts\python.exe"),
    (Join-Path $scriptDir "backend\.venv\Scripts\python.exe")
)

foreach ($path in $candidatePaths) {
    if (Test-Path $path) {
        $pythonExe = $path
        break
    }
}

if (-not $pythonExe) {
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        $pythonExe = "python"
    } elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
        $pythonExe = "py"
    } else {
        Write-Host "[ERROR] Python was not found in PATH or a local virtualenv." -ForegroundColor Red
        Write-Host "Please ensure Python 3.10+ is installed and accessible." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[1/2] Resetting local database tables using Python..." -ForegroundColor Cyan

# Execute backend reset module
Push-Location $scriptDir
try {
    & $pythonExe -m backend.reset_db
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Python database reset script exited with error code $LASTEXITCODE." -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# 3. Optional Docker PostgreSQL reset
if ($Docker) {
    Write-Host "`n[2/2] Resetting Docker PostgreSQL volume..." -ForegroundColor Cyan
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        Write-Host "[INFO] Stopping containers and removing 'postgres_data' volume..." -ForegroundColor Yellow
        Push-Location $scriptDir
        try {
            docker compose down -v
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Docker PostgreSQL volume cleared." -ForegroundColor Green
            } else {
                Write-Host "[WARN] Docker compose command returned code $LASTEXITCODE." -ForegroundColor Yellow
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "[WARN] Docker command was not found. Skipping Docker volume wipe." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[TIP] If you are using Docker containers, you can also run: .\reset_data.ps1 -Docker" -ForegroundColor DarkGray
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "         All Submissions and Assignments Removed!           " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
exit 0
