# Export reviewed NLP feedback from API and run retraining pipeline

param(
    [string]$BackendUrl = "http://localhost:8000",
    [string]$ApiPrefix = "/api/v1",
    [string]$AdminEmail = "admin@example.com",
    [string]$AdminPassword = "admin123",
    [string]$AccessToken = "",
    [bool]$ReviewedOnly = $true,
    [switch]$Train,
    [string]$ExportFormat = "json",
    [string]$ExportPath = "backend/generated/nlp_feedback_export.json",
    [string]$OutputDataset = "backend/generated/retraining_dataset.json",
    [int]$Epochs = 15,
    [int]$BatchSize = 16,
    [double]$LearningRate = 2e-5,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$BasePath
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"

if (-not (Test-Path (Join-Path $backendPath "app\main.py"))) {
    Write-Host "Error: backend app not found. Run this from project root." -ForegroundColor Red
    exit 1
}

$exportPathAbsolute = Resolve-AbsolutePath -Path $ExportPath -BasePath $projectRoot
$datasetPathAbsolute = Resolve-AbsolutePath -Path $OutputDataset -BasePath $projectRoot

$exportDir = Split-Path -Parent $exportPathAbsolute
$datasetDir = Split-Path -Parent $datasetPathAbsolute

if ($exportDir) {
    New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
}

if ($datasetDir) {
    New-Item -ItemType Directory -Path $datasetDir -Force | Out-Null
}

if ($ExportFormat -notin @("json", "csv")) {
    Write-Host "Error: ExportFormat must be 'json' or 'csv'." -ForegroundColor Red
    exit 1
}

$exportEndpoint = "$BackendUrl$ApiPrefix/admin/nlp-feedback/export?format=$ExportFormat&reviewed_only=$($ReviewedOnly.ToString().ToLower())"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "NLP Feedback Export + Retraining Pipeline" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Yellow
Write-Host "Export URL:  $exportEndpoint" -ForegroundColor Yellow
Write-Host "Export File: $exportPathAbsolute" -ForegroundColor Yellow
Write-Host "Dataset:     $datasetPathAbsolute" -ForegroundColor Yellow
Write-Host "Train:       $($Train.IsPresent)" -ForegroundColor Yellow
Write-Host "DryRun:      $($DryRun.IsPresent)" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun.IsPresent) {
    if (-not $AccessToken) {
        Write-Host "Logging in as admin/supervisor to get access token..." -ForegroundColor Cyan
        $loginBody = @{
            email = $AdminEmail
            password = $AdminPassword
        } | ConvertTo-Json

        $loginParams = @{
            Uri         = "$BackendUrl$ApiPrefix/auth/login"
            Method      = "Post"
            ContentType = "application/json"
            Body        = $loginBody
        }
        $loginResponse = Invoke-RestMethod @loginParams

        if (-not $loginResponse.access_token) {
            Write-Host "Error: login succeeded but no access token returned." -ForegroundColor Red
            exit 1
        }

        $AccessToken = $loginResponse.access_token
    }

    Write-Host "Exporting reviewed NLP feedback..." -ForegroundColor Cyan
    $exportParams = @{
        Uri     = $exportEndpoint
        Method  = "Get"
        Headers = @{ Authorization = "Bearer $AccessToken" }
        OutFile = $exportPathAbsolute
    }
    Invoke-WebRequest @exportParams

    Write-Host "Export complete." -ForegroundColor Green
    Write-Host ""
}

$pythonCandidates = @(
    (Join-Path $projectRoot "venv\Scripts\python.exe"),
    (Join-Path $backendPath "venv\Scripts\python.exe")
)

$pythonExe = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $pythonExe) {
    Write-Host "Error: Could not find Python virtual environment executable." -ForegroundColor Red
    Write-Host "Checked:" -ForegroundColor Yellow
    $pythonCandidates | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    exit 1
}

$pipelineArgs = @(
    "-m", "app.services.retraining_pipeline",
    "--feedback-file", $exportPathAbsolute,
    "--output-data", $datasetPathAbsolute,
    "--epochs", "$Epochs",
    "--batch-size", "$BatchSize",
    "--learning-rate", "$LearningRate"
)

if ($Train.IsPresent) {
    $pipelineArgs += "--train"
}

if ($DryRun.IsPresent) {
    Write-Host "[DryRun] Would run:" -ForegroundColor Yellow
    Write-Host "$pythonExe $($pipelineArgs -join ' ')" -ForegroundColor Yellow
    exit 0
}

Write-Host "Running retraining pipeline..." -ForegroundColor Cyan
Push-Location $backendPath
try {
    & $pythonExe @pipelineArgs
} finally {
    Pop-Location
}

Write-Host "" 
Write-Host "Done. Retraining pipeline completed." -ForegroundColor Green