# Train Multilingual Intent Classification Model
# Author: Brandon K Mhako (R223931W)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Model Training - AI Customer Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
$venvPath = ".\backend\venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & $venvPath
} else {
    Write-Host "Virtual environment not found at $venvPath" -ForegroundColor Red
    exit 1
}

# Check and install required packages
Write-Host ""
Write-Host "Checking ML dependencies..." -ForegroundColor Yellow

$packages = @("torch", "transformers", "scikit-learn")
$missingPackages = @()

foreach ($pkg in $packages) {
    $installed = pip show $pkg 2>$null
    if (-not $installed) {
        $missingPackages += $pkg
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host ""
    Write-Host "Installing missing packages: $($missingPackages -join ', ')" -ForegroundColor Yellow
    
    # Install PyTorch (CPU version for simplicity - can use CUDA if available)
    if ($missingPackages -contains "torch") {
        Write-Host "Installing PyTorch (CPU)..." -ForegroundColor Yellow
        pip install torch torchvision torchaudio
    }
    
    # Install other packages
    $otherPackages = $missingPackages | Where-Object { $_ -ne "torch" }
    if ($otherPackages.Count -gt 0) {
        pip install $otherPackages
    }
}

Write-Host ""
Write-Host "All dependencies installed!" -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location backend

# Run training
Write-Host "Starting model training..." -ForegroundColor Cyan
Write-Host ""
python -m app.services.retraining_pipeline --train

Write-Host ""
Write-Host "Training script completed!" -ForegroundColor Green
