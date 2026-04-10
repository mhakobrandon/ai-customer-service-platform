# Quick Setup Script - No PostgreSQL or Redis Required
# AI-Powered Customer Service Platform
# Brandon K Mhako (R223931W)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "AI Customer Service Platform - Quick Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "OK $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR Python not found! Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "OK Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR Node.js not found! Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setting up Backend..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Backend setup
Set-Location backend

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing Python dependencies (this may take a few minutes)..." -ForegroundColor Yellow
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

# Create .env file
Write-Host "Creating .env configuration..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "OK .env file created (using SQLite - no database installation needed!)" -ForegroundColor Green
} else {
    Write-Host "OK .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setting up Frontend..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Frontend setup
Set-Location ..\frontend

# Install dependencies
Write-Host "Installing Node.js dependencies (this may take a few minutes)..." -ForegroundColor Yellow
npm install --silent

# Create .env file
Write-Host "Creating frontend .env configuration..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    @"
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding UTF8
    Write-Host "OK Frontend .env file created" -ForegroundColor Green
} else {
    Write-Host "OK Frontend .env file already exists" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate" -ForegroundColor White
Write-Host "  python -m uvicorn app.main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Using SQLite database (no PostgreSQL needed!)" -ForegroundColor Green
Write-Host "Note: Redis is optional (app works without it)" -ForegroundColor Green
Write-Host ""
