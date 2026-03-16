@echo off
REM Build script for Windows (local development)
REM Uses embedded Python approach - no interference with system Python
REM For CI/CD builds, use .github/workflows/build.yml

echo Building YT-DLP Desktop for Windows...
echo This uses embedded Python approach for standalone executable.
echo.

REM Create bin directory
if not exist bin mkdir bin

REM Download yt-dlp
echo [1/4] Downloading yt-dlp...
powershell -Command "Invoke-WebRequest -Uri https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -OutFile bin\yt-dlp.exe" 2>nul || (
    echo Failed to download yt-dlp. Please check your internet connection.
    exit /b 1
)

REM Install dependencies
echo [2/4] Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

REM Build with PyInstaller
echo [3/4] Building with PyInstaller...
pyinstaller --onefile ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-binary "bin\yt-dlp.exe;bin" ^
    --hidden-import yt_dlp ^
    --name yt-dlp-desktop-windows-x64 ^
    --clean ^
    --windowed ^
    app.py

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed!
    exit /b 1
)

echo [4/4] Build complete!
echo.
echo Output: dist\yt-dlp-desktop-windows-x64.exe
echo.
echo This is a standalone executable with embedded Python.
echo Users don't need Python installed to run it.
echo.
pause