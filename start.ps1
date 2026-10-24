# PowerShell Startup Script for American English MediaWiki Localization Tool
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " American English Localization Tool for MediaWiki" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend/run.py"

Write-Host "Starting Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "Servers are launching!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
