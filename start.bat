@echo off
title JianWei Startup

echo ========================================
echo   JianWei One-Click Start
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI :8000)...
start "JW-Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend (Vite :5173)...
start "JW-Frontend" cmd /k "cd /d %~dp0. && npm run dev"

echo.
echo Done! Two windows opened:
echo   - JW-Backend  -^> http://localhost:8000
echo   - JW-Frontend -^> http://localhost:5173
echo.
pause
