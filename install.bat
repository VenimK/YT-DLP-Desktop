@echo off
echo ================================
echo   YT-DLP Desktop Installer
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.7+ from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo ✓ Python is installed

REM Create virtual environment
echo Creating virtual environment...
python -m venv yt-dlp-web

REM Install dependencies
echo Installing dependencies...
call yt-dlp-web\Scripts\activate
pip install flask yt-dlp

REM Create launch script
echo Creating launch script...
echo @echo off > launch.bat
echo echo Starting YT-DLP Desktop Application... >> launch.bat
echo echo. >> launch.bat
echo call yt-dlp-web\Scripts\activate >> launch.bat
echo python main.py >> launch.bat
echo pause >> launch.bat

echo.
echo ================================
echo   Installation Complete!
echo ================================
echo.
echo To start the application:
echo   1. Double-click 'launch.bat'
echo   2. Open http://localhost:8080 in your browser
echo.
echo The application will download files to this folder.
echo.
pause