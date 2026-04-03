@echo off
echo Starting Mechela...
echo.

REM Start backend in a new window
start "Mechela Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn app.main:app --reload"

REM Wait a moment for backend to initialise
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Mechela Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Wait for frontend to start, then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Mechela is starting up.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close the two terminal windows to stop Mechela.
