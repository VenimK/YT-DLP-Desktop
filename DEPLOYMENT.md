# YT-DLP Desktop Deployment Guide

## Current Project Structure

```
YT-DLP-Desktop/
├── app.py                 # Main Flask application
├── build.sh              # Build script for macOS
├── install.sh           # Setup script
├── install.bat          # Windows setup script
├── launch.command       # macOS launcher
├── launch.bat           # Windows launcher
├── templates/
│   └── index.html       # Web UI template
├── yt-dlp-web/          # Embedded Python environment
│   ├── bin/
│   │   ├── python
│   │   ├── yt-dlp
│   │   └── pyinstaller
│   └── lib/
│       └── python3.14/site-packages/
└── dist/
    └── yt-dlp-desktop   # Built executable (18MB)
```

## Build Process

### macOS (Current Platform)
```bash
# Clean build
rm -rf build/ dist/ __pycache__/ *.spec

# Rebuild
chmod +x build.sh
./build.sh

# Test
PORT=9090 ./dist/yt-dlp-desktop
```

## Cross-Platform Deployment Strategy

### 1. Multi-Platform Build Setup

Create separate build scripts for each target platform:

**build-macos.sh** (current):
```bash
PYTHON="$(pwd)/yt-dlp-web/bin/python"
$PYTHON -m PyInstaller --onefile --add-data "templates:templates" --add-binary "yt-dlp-web/bin/yt-dlp:./" --hidden-import yt_dlp --name yt-dlp-desktop app.py
```

**build-windows.bat**:
```batch
@echo off
set PYTHON=yt-dlp-web\Scripts\python.exe
%PYTHON% -m PyInstaller --onefile --add-data "templates;templates" --add-binary "yt-dlp-web\bin\yt-dlp;." --hidden-import yt_dlp --name yt-dlp-desktop app.py
```

**build-linux.sh**:
```bash
PYTHON="$(pwd)/yt-dlp-web/bin/python"
$PYTHON -m PyInstaller --onefile --add-data "templates:templates" --add-binary "yt-dlp-web/bin/yt-dlp:./" --hidden-import yt_dlp --name yt-dlp-desktop app.py
```

### 2. Platform-Specific Considerations

**macOS**:
- Built for ARM64 (Apple Silicon)
- May need universal binary for Intel/ARM support
- Requires code signing for distribution

**Windows**:
- Requires Windows-specific Python builds
- May need UPX compression to reduce size
- Consider NSIS installer packaging

**Linux**:
- Build on target architecture (amd64/arm64)
- Consider AppImage packaging for portability
- May need to bundle additional libraries

### 3. Deployment Packages

**Option A: Single Executable (Current)**
- 18MB standalone binary
- Contains Python runtime + all dependencies
- Works on compatible macOS systems

**Option B: Platform-Specific Packages**
- macOS: .dmg installer with app bundle
- Windows: .exe installer with Start Menu entry
- Linux: .AppImage or .deb/.rpm package

**Option C: Source Distribution**
- Provide requirements.txt for manual setup
- Users install Python + dependencies
- More flexible but less user-friendly

### 4. Distribution Files

Essential files to distribute:
- `dist/yt-dlp-desktop` (executable)
- `templates/index.html` (web UI)
- README.md (instructions)

Optional:
- Platform-specific installers
- Icons/launchers
- Documentation

### 5. Testing Matrix

Test on:
- ✅ macOS ARM64 (current)
- ⬜ macOS Intel
- ⬜ Windows 10/11
- ⬜ Linux (Ubuntu/Debian)
- ⬜ Linux (Fedora/CentOS)

### 6. Next Steps

1. **Create cross-platform build scripts**
2. **Set up CI/CD pipeline** (GitHub Actions)
3. **Test on target platforms**
4. **Create installers/packages**
5. **Document deployment process**

### 7. Current Limitations

- Only builds for macOS ARM64
- No universal binary support
- No code signing
- No automated testing pipeline
- Limited platform testing

### 8. Recommended Improvements

1. Add GitHub Actions for automated builds
2. Create universal macOS binaries
3. Add Windows/Linux build support
4. Implement code signing
5. Create proper installers
6. Add automated testing
7. Document deployment process

## Quick Start for Current macOS Build

```bash
# Clean and rebuild
rm -rf build/ dist/ __pycache__/ *.spec
./build.sh

# Run on custom port
PORT=9090 ./dist/yt-dlp-desktop

# Access at http://localhost:9090
```

The built executable is completely self-contained and can be distributed to other macOS users with compatible architecture.