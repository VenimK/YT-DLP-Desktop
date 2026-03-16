@echo off
echo Starting YT-DLP Desktop Application...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "yt-dlp-web" (
    echo Creating virtual environment...
    python -m venv yt-dlp-web
)

REM Activate virtual environment and install dependencies
echo Installing dependencies...
call yt-dlp-web\Scripts\activate
pip install flask yt-dlp >nul 2>&1

REM Start the application
echo Starting application...
echo.
echo YT-DLP Desktop will open at: http://localhost:8080
echo.
python main.py

pause