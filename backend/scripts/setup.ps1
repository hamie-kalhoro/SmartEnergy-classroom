# Professional One-Time Environment Setup
Write-Host "🚀 Initializing Professional Backend Environment..." -ForegroundColor Cyan

$BackendDir = Get-Location
$VenvDir = Join-Path $BackendDir "venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

# 1. Create Virtual Environment if it doesn't exist
if (!(Test-Path $VenvDir)) {
    Write-Host "📦 Creating dedicated virtual environment (venv)..." -ForegroundColor Yellow
    python -m venv venv
}

# 2. Upgrade pip and install requirements
Write-Host "📥 Installing dependencies (one-time setup)..." -ForegroundColor Yellow
& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r requirements.txt

Write-Host "`n✨ Setup Complete! Dependencies are now locked in 'venv'." -ForegroundColor Green
Write-Host "👉 To start the server, use: .\scripts\run.ps1" -ForegroundColor Cyan
