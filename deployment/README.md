# YT-DLP Desktop Deployment Package

## Zero-Dependency macOS Application

This package contains a completely self-contained YouTube downloader application that requires:
- **No Python installation**
- **No system dependencies**
- **No internet connection** (after download)

## What's Included

- `yt-dlp-desktop` - Main executable (18MB)
- `templates/index.html` - Web UI interface
- Embedded Python runtime
- Embedded yt-dlp binary
- All required Python packages

## System Requirements

- **macOS**: 11.0+ (Big Sur or newer)
- **Architecture**: ARM64 (Apple Silicon)
- **Storage**: ~20MB free space
- **Memory**: 128MB+ RAM

## Installation

### Method 1: Simple Copy (Recommended)
```bash
# Copy these files to any location:
cp yt-dlp-desktop ~/Applications/
cp -r templates/ ~/Applications/

# Run from anywhere:
cd ~/Applications
PORT=9090 ./yt-dlp-desktop
```

### Method 2: Application Bundle
```bash
# Create app bundle structure
mkdir -p "YT-DLP Desktop.app/Contents/MacOS"
mkdir -p "YT-DLP Desktop.app/Contents/Resources"

# Copy executable
cp yt-dlp-desktop "YT-DLP Desktop.app/Contents/MacOS/"
cp -r templates/ "YT-DLP Desktop.app/Contents/Resources/"

# Create Info.plist (optional)
```

## Usage

### Basic Usage
```bash
# Run on default port (8080)
./yt-dlp-desktop

# Run on custom port
PORT=9090 ./yt-dlp-desktop

# Run in background
PORT=9090 ./yt-dlp-desktop &
```

### Access the Application
1. Open your web browser
2. Navigate to: `http://localhost:8080` (or your custom port)
3. Paste YouTube URL and configure download options
4. Click "Download"

### Network Access
By default, the application runs on `127.0.0.1` (localhost only). To allow network access:

```bash
# Allow LAN access
HOST=0.0.0.0 PORT=9090 ./yt-dlp-desktop

# Then access from other devices:
# http://[your-computer-ip]:9090
```

## File Locations

- **Downloads**: Files are saved in the same directory where you run the executable
- **Templates**: Required for the web interface
- **Logs**: Output appears in the terminal

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
PORT=9090 ./yt-dlp-desktop
```

### Permission Denied
```bash
# Make executable
chmod +x yt-dlp-desktop
```

### App Doesn't Start
- Verify macOS version compatibility
- Check architecture (built for Apple Silicon)
- Ensure you have execute permissions

## Technical Details

- **Python**: 3.14.3 (embedded)
- **Web Framework**: Flask 3.1.3
- **Download Engine**: yt-dlp 2026.3.3
- **Packaging**: PyInstaller 6.19.0
- **Architecture**: ARM64 (Apple Silicon)

## Building from Source

If you need to rebuild the application:

```bash
# Ensure you have the build environment
cd /path/to/YT-DLP-Desktop
./build.sh
```

## Security Notes

- The application runs a local web server
- No external internet access required (except for YouTube)
- All processing happens locally
- No data is sent to external servers

## Support

For issues or feature requests, please check the original repository or create an issue.

---

**Note**: This is a development build. For production use, consider code signing and notarization for macOS Gatekeeper compatibility.