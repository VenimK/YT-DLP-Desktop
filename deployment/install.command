#!/usr/bin/env bash
# Installation script for YT-DLP Desktop

echo "Installing YT-DLP Desktop..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default installation location
INSTALL_DIR="$HOME/Applications/YT-DLP Desktop"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy files
echo "Copying application files..."
cp "$SCRIPT_DIR/yt-dlp-desktop" "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/templates" "$INSTALL_DIR/"

# Make executable
chmod +x "$INSTALL_DIR/yt-dlp-desktop"

# Create launcher script
cat > "$INSTALL_DIR/launch.command" << 'EOF'
#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT=9090 ./yt-dlp-desktop
EOF

chmod +x "$INSTALL_DIR/launch.command"

echo "Installation complete!"
echo "Application installed to: $INSTALL_DIR"
echo ""
echo "To start the application:"
echo "  1. Double-click 'launch.command' in the installation folder"
echo "  2. Or run: cd '$INSTALL_DIR' && PORT=9090 ./yt-dlp-desktop"
echo "  3. Open your browser to: http://localhost:9090"
echo ""
echo "Note: The application will download files to the current directory."