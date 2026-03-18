# YT-DLP Desktop

[![Build & Release](https://github.com/VenimK/YT-DLP-Desktop/actions/workflows/build.yml/badge.svg)](https://github.com/VenimK/YT-DLP-Desktop/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/VenimK/YT-DLP-Desktop)](https://github.com/VenimK/YT-DLP-Desktop/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


## ❤️ Support Me
Enjoy my projects? Any support is greatly appreciated!

[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/VenimK)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/venimK)


A modern, cross-platform YouTube downloader desktop application built with Flask and modern web technologies. Features a beautiful glassmorphism UI, real-time download progress, playlist support, and more.

![YT-DLP Desktop Screenshot](screenshot.png)

## ✨ Features

- 🎨 **Modern Glassmorphism UI** - Beautiful interface with animated backgrounds
- 🌓 **Dark/Light Mode** - Toggle between themes
- 📥 **Real-time Progress** - Live download progress with speed and ETA
- 📝 **Playlist Support** - Download entire playlists or select specific videos
- 🎵 **Audio Extraction** - Download audio only in various formats (MP3, FLAC, AAC, etc.)
- 🎬 **Multiple Formats** - Support for various video qualities (4K, 1080p, 720p, etc.)
- 🗂️ **Subtitle Download** - Download video subtitles in multiple languages
- 🖼️ **Metadata & Thumbnails** - Embed metadata and thumbnails in audio files
- ⌨️ **Keyboard Shortcuts** - Power-user shortcuts (Ctrl+D, Ctrl+Q, Ctrl+Enter)
- 🔒 **Standalone Executable** - No Python installation required (embedded Python)

## 🚀 Download

Pre-built executables are available on the [Releases](https://github.com/YOUR_USERNAME/YT-DLP-Desktop/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `yt-dlp-desktop-macos-arm64` |
| macOS (Intel) | `yt-dlp-desktop-macos-x64` |
| Windows | `yt-dlp-desktop-windows-x64.exe` |
| Linux | `yt-dlp-desktop-linux-x64` |

## 🛠️ Installation

### Quick Start

1. Download the appropriate executable for your platform from [Releases](https://github.com/YOUR_USERNAME/YT-DLP-Desktop/releases)
2. Make it executable (macOS/Linux):
   ```bash
   chmod +x yt-dlp-desktop-macos-arm64  # or yt-dlp-desktop-linux-x64
   ```
3. Run it!
   ```bash
   ./yt-dlp-desktop-macos-arm64
   ```

The app will open in your browser at `http://localhost:8080`.

### macOS

```bash
# Download latest release
curl -L -o yt-dlp-desktop https://github.com/YOUR_USERNAME/YT-DLP-Desktop/releases/latest/download/yt-dlp-desktop-macos-arm64
chmod +x yt-dlp-desktop
./yt-dlp-desktop
```

### Windows

1. Download `yt-dlp-desktop-windows-x64.exe`
2. Double-click to run
3. Browser will open automatically

### Linux

```bash
# Download latest release
curl -L -o yt-dlp-desktop https://github.com/YOUR_USERNAME/YT-DLP-Desktop/releases/latest/download/yt-dlp-desktop-linux-x64
chmod +x yt-dlp-desktop
./yt-dlp-desktop
```

Optional - install system-wide:
```bash
sudo mv yt-dlp-desktop /usr/local/bin/
```

## 🔧 Development Setup

### Prerequisites

- Python 3.11+
- pip

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YT-DLP-Desktop.git
cd YT-DLP-Desktop

# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
```

The app will open in your browser at `http://localhost:8080`.

### Building Locally

#### macOS

```bash
chmod +x build-macos.sh
./build-macos.sh
```

#### Linux

```bash
chmod +x build-linux.sh
./build-linux.sh
```

#### Windows

```cmd
build-windows.bat
```

Or use the unified build script:

```bash
chmod +x build.sh
./build.sh  # Auto-detects platform
```

## 🏗️ Architecture

### Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript, CSS3 (Glassmorphism design)
- **Build**: PyInstaller (creates standalone executable)
- **Download Engine**: yt-dlp

### File Structure

```
YT-DLP-Desktop/
├── app.py                 # Flask backend
├── main.py               # Entry point
├── requirements.txt      # Python dependencies
├── templates/
│   └── index.html       # Main UI
├── static/
│   ├── css/            # Stylesheets (theme, components, layout, animations)
│   └── js/             # JavaScript modules (API, UI, downloads, playlist, lyrics)
├── .github/workflows/   # GitHub Actions CI/CD
│   └── build.yml
├── build-*.sh/bat      # Platform-specific build scripts
└── README.md
```

### Modular Frontend Architecture

The frontend is split into modular JavaScript files:

- `utils.js` - Utility functions (debounce, formatters, storage)
- `api.js` - Backend API client
- `ui.js` - UI components, theme manager, toast notifications
- `playlist.js` - Playlist management
- `downloads.js` - Download queue and progress tracking
- `lyrics.js` - Lyrics viewer/parser
- `app.js` - Main application initialization

### Embedded Python Approach

The app uses PyInstaller to create standalone executables with embedded Python:

- ✅ No Python installation required on user's system
- ✅ No interference with existing Python installations
- ✅ Self-contained - all dependencies bundled
- ✅ Works on clean systems

## 🔄 CI/CD

This project uses **GitHub Actions** for automated cross-platform builds.

### Workflow

1. **Trigger**: Push to `main` or tag push (`v*`)
2. **Build Matrix**:
   - macOS (x64, ARM64)
   - Windows (x64)
   - Linux (x64)
3. **Artifacts**: Uploaded to workflow run
4. **Release**: Auto-created on tag push with all binaries

### Manual Trigger

Go to **Actions** → **Build & Release** → **Run workflow**

## 📝 Usage

### Basic Download

1. Paste a YouTube URL
2. Video preview will appear automatically
3. Select format/quality (optional)
4. Click "Start Download"
5. Monitor progress in real-time

### Playlist Download

1. Paste a playlist URL
2. Click "Load Playlist Contents"
3. Select videos to download (or use Select All)
4. Configure options
5. Download

### Audio Extraction

1. Check "Extract Audio Only"
2. Select audio format (MP3, FLAC, etc.)
3. Adjust quality (0=best, 9=worst)
4. Enable "Embed Thumbnail" for album art

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+D` | Focus URL input |
| `Ctrl+Q` | Clear form |
| `Ctrl+Enter` | Start download |
| `Esc` | Close lyrics viewer |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The amazing YouTube downloader
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [PyInstaller](https://www.pyinstaller.org/) - Bundling tool

## 📧 Support

- Create an [Issue](https://github.com/YOUR_USERNAME/YT-DLP-Desktop/issues) for bug reports
- Start a [Discussion](https://github.com/YOUR_USERNAME/YT-DLP-Desktop/discussions) for questions

---

**Note**: This tool is for personal use only. Please respect copyright laws and YouTube's Terms of Service.
