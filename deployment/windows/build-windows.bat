@echo off
REM Build standalone executable for Windows

REM Set Python path for Windows
set PYTHON=yt-dlp-web\Scripts\python.exe

REM Verify Python exists
if not exist "%PYTHON%" (
    echo Error: Python interpreter not found at %PYTHON%
    exit /b 1
)

REM Ensure PyInstaller is installed
%PYTHON% -m pip show pyinstaller >nul 2>&1 || %PYTHON% -m pip install pyinstaller

REM Build for Windows
%PYTHON% -m PyInstaller ^
  --onefile ^
  --add-data "templates;templates" ^
  --add-binary "yt-dlp-web\bin\yt-dlp;." ^
  --hidden-import yt_dlp ^
  --name yt-dlp-desktop.exe ^
  app.py

echo Build complete. Executable located in .\dist\yt-dlp-desktop.exe