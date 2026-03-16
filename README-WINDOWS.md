# Windows Build Instructions

## Prerequisites for Windows Build

To build the Windows version on your macOS system, you need:

### Option 1: Windows Virtual Machine
- VirtualBox, VMware, or Parallels
- Windows 10/11 installation
- Python 3.14+ installed on Windows

### Option 2: Cross-Compilation (Advanced)
- Docker with Windows container support
- mingw-w64 toolchain

### Option 3: GitHub Actions (Recommended)
- Set up GitHub Actions workflow
- Automated Windows builds

## Current Limitations

The current build environment on your macOS system can only produce:
- ✅ **macOS ARM64** executables (what you have)
- ❌ **Windows** executables (requires Windows environment)
- ❌ **Linux** executables (requires Linux environment)

## Recommended Approach

### 1. GitHub Actions Automated Builds

Create `.github/workflows/build.yml`:

```yaml
name: Build YT-DLP Desktop
on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.14'
    
    - name: Install dependencies
      run: pip install pyinstaller flask yt-dlp
    
    - name: Build executable
      run: python -m PyInstaller --onefile --add-data "templates:templates" --name yt-dlp-desktop app.py
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: yt-dlp-desktop-${{ matrix.os }}
        path: dist/
```

### 2. Manual Windows Build Process

If you have access to a Windows machine:

1. **Copy these files to Windows**:
   - `app.py`
   - `templates/` directory
   - `build-windows.bat`
   - `install-windows.bat`

2. **On Windows machine**:
   ```cmd
   # Install Python
   winget install Python.Python.3.14
   
   # Install dependencies
   pip install pyinstaller flask yt-dlp
   
   # Build
   build-windows.bat
   ```

3. **Test the Windows executable**:
   ```cmd
   set PORT=9090
   dist\yt-dlp-desktop.exe
   ```

## Windows-Specific Considerations

### File Paths
Windows uses backslashes and different path separators:
- `templates;templates` (PyInstaller)
- `yt-dlp-web\bin\yt-dlp;.`

### Environment Variables
Windows uses `set` instead of `export`:
```cmd
set PORT=9090
yt-dlp-desktop.exe
```

### Service Management
Windows may need additional configuration for:
- Firewall exceptions
- Startup scripts
- Service installation

## Distribution Packages

For Windows users, consider creating:
- **Installer**: NSIS or Inno Setup package
- **Portable ZIP**: Simple zip with executable + templates
- **Store package**: Microsoft Store distribution

## Next Steps

1. **Set up GitHub Actions** for automated multi-platform builds
2. **Test on Windows VM** if available
3. **Create Windows installer** package
4. **Document Windows-specific instructions**

## Current Status

- ✅ macOS ARM64 build working
- ⏳ Windows build scripts ready (need Windows environment)
- ⏳ Linux build preparation
- ⏳ Multi-platform automation setup

The application architecture is **cross-platform ready** - you just need the appropriate build environments for each target OS.