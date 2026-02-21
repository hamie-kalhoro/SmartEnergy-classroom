# Start Backend Server
Write-Host "Starting SmartEnergy Backend..." -ForegroundColor Green

$VenvPython = ".\venv\Scripts\python.exe"
if (!(Test-Path $VenvPython)) {
    $VenvPython = ".\.venv\Scripts\python.exe"
}

if (!(Test-Path $VenvPython)) {
    Write-Host "Error: Virtual environment not found. Please run .\scripts\setup.ps1 first." -ForegroundColor Red
    exit 1
}

& $VenvPython app.py
