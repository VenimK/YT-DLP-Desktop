#!/bin/bash
# Build script for Linux (local development)
# Uses embedded Python approach - no interference with system Python
# For CI/CD builds, use .github/workflows/build.yml

set -e

echo "🐧 Building YT-DLP Desktop for Linux..."
echo "This uses embedded Python approach for standalone executable."
echo ""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ]; then
    echo "⚠️  Warning: This build script is optimized for x86_64. Detected: $ARCH"
fi

# Download yt-dlp
echo "📥 [1/4] Downloading yt-dlp..."
mkdir -p bin
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o bin/yt-dlp
chmod +x bin/yt-dlp
echo "✅ yt-dlp downloaded"

# Check for ffmpeg
echo "🔍 Checking for ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Some features may not work."
    echo "   Install with: sudo apt-get install ffmpeg  (Debian/Ubuntu)"
    echo "                 sudo yum install ffmpeg      (RHEL/CentOS)"
fi

# Install dependencies
echo "📦 [2/4] Installing dependencies..."
pip install -r requirements.txt
pip install pyinstaller
echo "✅ Dependencies installed"

# Build with PyInstaller
echo "🔨 [3/4] Building with PyInstaller..."
pyinstaller --onefile \
    --add-data "templates:templates" \
    --add-data "static:static" \
    --add-binary "bin/yt-dlp:bin" \
    --hidden-import yt_dlp \
    --name yt-dlp-desktop-linux-x64 \
    --clean \
    app.py

echo "✅ Build complete!"

# Test executable
echo "🧪 [4/4] Testing executable..."
if [ -f "dist/yt-dlp-desktop-linux-x64" ]; then
    echo "✅ Executable created successfully"
    echo ""
    echo "📁 Output: dist/yt-dlp-desktop-linux-x64"
    echo ""
    echo "To test run:"
    echo "  ./dist/yt-dlp-desktop-linux-x64"
    echo ""
    echo "To install system-wide:"
    echo "  sudo cp dist/yt-dlp-desktop-linux-x64 /usr/local/bin/yt-dlp-desktop"
else
    echo "❌ Build failed - executable not found"
    exit 1
fi
