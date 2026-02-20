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
}
else {
    Write-Host "✅ Virtual environment already exists." -ForegroundColor Green
}

# 4. Install Dependencies
Write-Host "📥 Installing/Updating dependencies..." -ForegroundColor Yellow
& $PythonExe -m pip install --upgrade pip
& $PipExe install -r requirements.txt

# 5. Check .env
if (!(Test-Path ".env")) {
    Write-Host "⚠️ .env not found. Creating default..." -ForegroundColor Yellow
    $EnvContent = @"
# Backend Configuration
FLASK_ENV=development
SECRET_KEY=fyp-secret-key-$(Get-Random)
JWT_SECRET_KEY=fyp-jwt-secret-key-$(Get-Random)

# Database Connection
# Use Supavisor Pooler for IPv4 support (Session Mode, Port 5432)
# DATABASE_URL=postgresql://user:pass@aws-0-region.pooler.supabase.com:5432/dbname

# Email Service (Brevo/SMTP)
MAIL_SERVER=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-api-key
MAIL_DEFAULT_SENDER=noreply@smartenergy.com
"@
    $EnvContent | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "`n✨ Setup complete! Run with: .\venv\Scripts\python.exe app.py" -ForegroundColor Green
