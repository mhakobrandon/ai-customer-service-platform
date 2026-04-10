# update-whatsapp-token.ps1
# Usage: .\update-whatsapp-token.ps1 -Token "YOUR_NEW_TOKEN"
# This updates the token in backend/.env WITHOUT needing to restart the backend.

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$envFile = "backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: $envFile not found. Run from project root." -ForegroundColor Red
    exit 1
}

# Replace the WHATSAPP_ACCESS_TOKEN line
$content = Get-Content $envFile
$updated = $content | ForEach-Object {
    if ($_ -match "^WHATSAPP_ACCESS_TOKEN=") {
        "WHATSAPP_ACCESS_TOKEN=$Token"
    } else {
        $_
    }
}
$updated | Set-Content $envFile

Write-Host "Token updated in $envFile" -ForegroundColor Green

# Test the token immediately against Meta's API
Write-Host "Testing token against Meta API..." -ForegroundColor Yellow
$result = & backend\venv\Scripts\python.exe -c @"
import httpx
token = '$Token'
r = httpx.get('https://graph.facebook.com/v19.0/me?access_token=' + token)
data = r.json()
if r.status_code == 200:
    print('Token is VALID. App:', data.get('name', data))
else:
    err = data.get('error', {})
    print('Token INVALID:', err.get('message', data))
"@

Write-Host $result

if ($result -like "*VALID*") {
    Write-Host ""
    Write-Host "SUCCESS: Token is valid. The backend will use the new token on next message (no restart needed)." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: Token appears invalid. Please generate a fresh token from Meta Developer Portal." -ForegroundColor Red
    Write-Host "Go to: https://developers.facebook.com -> Your App -> WhatsApp -> API Setup -> Generate Token" -ForegroundColor Yellow
}
