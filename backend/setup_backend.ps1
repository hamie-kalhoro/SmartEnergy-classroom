# SmartEnergy Backend Setup Script
Write-Host "🚀 Starting SmartEnergy Backend Setup..." -ForegroundColor Cyan

# 1. Check for Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Paths
$BackendDir = Get-Location
$VenvDir = Join-Path $BackendDir "venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
$PipExe = Join-Path $VenvDir "Scripts\pip.exe"

# 3. Create Virtual Environment
if (!(Test-Path $VenvDir)) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host "✅ Virtual environment already exists." -ForegroundColor Green
}

# 4. Install Dependencies
Write-Host "📥 Installing/Updating dependencies..." -ForegroundColor Yellow
& $PythonExe -m pip install --upgrade pip
& $PipExe install -r requirements.txt

# 5. Check .env
if (!(Test-Path ".env")) {
    Write-Host "⚠️ .env not found. Creating default..." -ForegroundColor Yellow
    "DB_USER=root`nDB_PASSWORD=root`nDB_HOST=localhost`nDB_PORT=3306`nDB_NAME=smart_class_energy_saver`nSECRET_KEY=fyp-secret-key-$(Get-Random)" | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "`n✨ Setup complete! Run with: .\venv\Scripts\python.exe app.py" -ForegroundColor Green
