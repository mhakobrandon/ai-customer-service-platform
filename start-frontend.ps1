# Start Frontend Development Server
# Run this script to start the React frontend

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Starting AI Customer Service Platform Frontend" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "frontend\package.json")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Set-Location frontend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Error: Dependencies not installed. Run setup.ps1 first!" -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=http://localhost:8000
"@ | Out-File -FilePath .env -Encoding UTF8
}

Write-Host ""
Write-Host "Starting development server on http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Make sure the backend is running first!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev
