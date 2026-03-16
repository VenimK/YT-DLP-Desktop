#!/bin/bash
# Build script for macOS (local development)
# For CI/CD builds, use .github/workflows/build.yml

set -e

echo "🍎 Building YT-DLP Desktop for macOS..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    ARCH_NAME="arm64"
else
    YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos_legacy"
    ARCH_NAME="x64"
fi

echo "📥 Downloading yt-dlp for $ARCH..."
mkdir -p bin
curl -L "$YT_DLP_URL" -o bin/yt-dlp
chmod +x bin/yt-dlp

echo "📦 Installing dependencies..."
pip install -r requirements.txt
pip install pyinstaller

echo "🔨 Building with PyInstaller..."
pyinstaller --onefile \
    --add-data "templates:templates" \
    --add-data "static:static" \
    --add-binary "bin/yt-dlp:bin" \
    --hidden-import yt_dlp \
    --name "yt-dlp-desktop-macos-$ARCH_NAME" \
    --clean \
    app.py

echo "✅ Build complete!"
echo "📁 Output: dist/yt-dlp-desktop-macos-$ARCH_NAME"
echo ""
echo "To test run:"
echo "  ./dist/yt-dlp-desktop-macos-$ARCH_NAME"
