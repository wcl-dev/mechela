@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================
echo   Mechela - Local AI Setup (Windows)
echo ============================================
echo.

:: Check if Ollama is already installed
where ollama >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Ollama is already installed.
) else (
    echo [..] Ollama not found. Installing via winget...
    winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] winget installation failed.
        echo Please download and install Ollama manually from:
        echo   https://ollama.com/download
        echo.
        echo After installing, run this script again.
        pause
        exit /b 1
    )
    echo [OK] Ollama installed successfully.
    echo.
    echo NOTE: You may need to restart your terminal for the ollama command to be available.
    echo       If the next steps fail, close this window, open a new one, and run this script again.
    echo.
)

:: Start Ollama service if not running
echo [..] Ensuring Ollama service is running...
tasklist /fi "imagename eq ollama.exe" 2>nul | find /i "ollama.exe" >nul
if %errorlevel% neq 0 (
    start "" ollama serve
    timeout /t 3 /nobreak >nul
)

:: Pull chat model
echo.
echo [..] Pulling gemma3:4b chat model (~3.3 GB)...
echo     This may take a few minutes on first run.
ollama pull gemma3:4b
if %errorlevel% neq 0 (
    echo [ERROR] Failed to pull gemma3:4b. Is Ollama running?
    echo   Try: ollama serve   (in another terminal)
    pause
    exit /b 1
)
echo [OK] gemma3:4b ready.

:: Pull embedding model
echo.
echo [..] Pulling nomic-embed-text embedding model (~270 MB)...
ollama pull nomic-embed-text
if %errorlevel% neq 0 (
    echo [ERROR] Failed to pull nomic-embed-text.
    pause
    exit /b 1
)
echo [OK] nomic-embed-text ready.

:: Done
echo.
echo ============================================
echo   Setup complete!
echo.
echo   Open Mechela and select "Local AI" in
echo   Settings to start using local models.
echo ============================================
echo.
pause
