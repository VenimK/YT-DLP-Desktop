@echo off
REM YT-DLP Desktop Windows Installer

echo Installing YT-DLP Desktop for Windows...

REM Get script directory
for /f "delims=" %%I in ("%~dp0") do set SCRIPT_DIR=%%~fI

REM Default installation location
set INSTALL_DIR=%USERPROFILE%\Applications\YT-DLP Desktop

REM Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy files
echo Copying application files...
copy "%SCRIPT_DIR%\dist\yt-dlp-desktop.exe" "%INSTALL_DIR%"
xcopy "%SCRIPT_DIR%\templates" "%INSTALL_DIR%\templates" /E /I /Y

REM Create launcher batch file
echo @echo off > "%INSTALL_DIR%\launch.bat"
echo cd /d "%~dp0" >> "%INSTALL_DIR%\launch.bat"
echo set PORT=9090 >> "%INSTALL_DIR%\launch.bat"
echo yt-dlp-desktop.exe >> "%INSTALL_DIR%\launch.bat"
echo pause >> "%INSTALL_DIR%\launch.bat"

echo.
echo Installation complete!
echo Application installed to: %INSTALL_DIR%
echo.
echo To start the application:
echo   1. Double-click 'launch.bat' in the installation folder
echo   2. Or open Command Prompt and run:
echo      cd "%INSTALL_DIR%" ^&^& set PORT=9090 ^& yt-dlp-desktop.exe
echo   3. Open your browser to: http://localhost:9090
echo.
echo Note: The application will download files to the current directory.

pause