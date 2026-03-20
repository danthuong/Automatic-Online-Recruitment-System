@echo off
chcp 65001 >nul
title HCMUT Exam System - AI Server

echo ================================================
echo   HCMUT Automatic Online Recruitment System
echo   AI Proctoring Server
echo ================================================
echo.

cd /d "%~dp0ai"

if exist "..\venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call "..\venv\Scripts\activate.bat"
)

echo [INFO] Checking dependencies...
pip install -r requirements.txt -q 2>nul

echo.
echo ================================================
echo   Starting AI Server...
echo ================================================
echo.
echo   Open your browser and go to:
echo   - http://localhost:8765/phone   (for phone camera page)
echo   - http://localhost:8765/qr      (QR code only)
echo.
echo   Waiting for connections...
echo ================================================
echo.

python server.py

pause
