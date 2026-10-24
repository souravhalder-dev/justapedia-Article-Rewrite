@echo off
echo ========================================================
echo  American English Localization Tool for MediaWiki
echo ========================================================
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "MediaWiki Backend (FastAPI)" cmd /k "python backend\run.py"

echo Starting Next.js Frontend on http://localhost:3000 ...
start "MediaWiki Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting!
echo Open your browser at: http://localhost:3000
echo Backend API Docs at: http://127.0.0.1:8000/docs
echo ========================================================
pause
