@echo off
chcp 65001 >nul
title HCMUT Exam System - AI Server

echo ================================================
echo   HCMUT Automatic Online Recruitment System
echo   AI Proctoring Server
echo ================================================
echo.

cd /d "%~dp0"

if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [WARN] Virtual environment not found. Using system Python.
)

echo [INFO] Checking dependencies...
pip install -r requirements.txt -q 2>nul

echo.
echo ================================================
echo   Starting AI Server...
echo ================================================
echo.
echo   Open your browser and go to:
echo   - https://localhost:8765/phone   (for phone camera page)
echo   - https://localhost:8765/qr      (QR code only)
echo.
echo   NOTE: Accept the security warning in your browser to proceed.
echo.
echo   Waiting for connections...
echo ================================================
echo.

python ai\server.py

pause
