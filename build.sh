#!/usr/bin/env bash
# Build standalone executable for YT-DLP Desktop using PyInstaller
# Uses embedded Python approach - no interference with system Python
# For CI/CD builds, see .github/workflows/build.yml

set -e

echo "🔨 Building YT-DLP Desktop..."
echo "This creates a standalone executable with embedded Python."
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$OS" = "darwin" ]; then
    echo "🍎 Detected: macOS ($ARCH)"
    exec ./build-macos.sh
elif [ "$OS" = "linux" ]; then
    echo "🐧 Detected: Linux ($ARCH)"
    exec ./build-linux.sh
else
    echo "❌ Unsupported OS: $OS"
    echo "Use platform-specific build scripts:"
    echo "  - macOS: ./build-macos.sh"
    echo "  - Linux: ./build-linux.sh"
    echo "  - Windows: build-windows.bat"
    exit 1
fi
