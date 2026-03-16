#!/bin/bash

echo "================================"
echo "   YT-DLP Desktop Installer"
echo "================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo
    echo "Please install Python 3.7+ using one of these methods:"
    echo "  macOS: brew install python or download from https://python.org"
    echo "  Linux: sudo apt install python3 python3-pip"
    echo
    exit 1
fi

echo "✓ Python is installed"

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv yt-dlp-web

# Install dependencies
echo "Installing dependencies..."
source yt-dlp-web/bin/activate
pip install flask yt-dlp

# Create launch script
echo "Creating launch script..."
echo '#!/bin/bash' > launch.command
echo 'echo "Starting YT-DLP Desktop Application..."' >> launch.command
echo 'echo' >> launch.command
echo 'cd "$(dirname "$0")"' >> launch.command
echo 'source yt-dlp-web/bin/activate' >> launch.command
echo 'python main.py' >> launch.command
chmod +x launch.command

echo
echo "================================"
echo "   Installation Complete!"
echo "================================"
echo
echo "To start the application:"
echo "  1. Double-click 'launch.command' (macOS)"
echo "  2. Or run: bash launch.command"
echo "  3. Open http://localhost:8080 in your browser"
echo
echo "The application will download files to this folder."
echo