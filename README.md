# YT-DLP Desktop

[![GitHub Release](https://img.shields.io/github/v/release/VenimK/YT-DLP-Desktop)](https://github.com/VenimK/YT-DLP-Desktop/releases/latest/download/yt-dlp-desktop-macos-arm64.zip)
[![GitHub Release Date](https://img.shields.io/github/release-date/VenimK/YT-DLP-Desktop?style=flat)](https://github.com/VenimK/YT-DLP-Desktop/releases)
[![GitHub Downloads Latest](https://img.shields.io/github/downloads/VenimK/YT-DLP-Desktop/latest/yt-dlp-desktop-linux-x64?style=flat&label=⬇+Linux&color=orange)](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-linux-x64)
[![GitHub Downloads Latest](https://img.shields.io/github/downloads/VenimK/YT-DLP-Desktop/latest/yt-dlp-desktop-windows-x64.exe?style=flat&label=⬇+Windows&color=orange)](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-windows-x64.exe)
[![GitHub Downloads Latest](https://img.shields.io/github/downloads/VenimK/YT-DLP-Desktop/latest/yt-dlp-desktop-macos-arm64.zip?style=flat&label=⬇+macOS+ARM64&color=orange)](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-macos-arm64.zip)
[![GitHub Downloads Latest](https://img.shields.io/github/downloads/VenimK/YT-DLP-Desktop/latest/total?style=flat&label=⬇+Total&color=blue)](https://github.com/VenimK/YT-DLP-Desktop/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


## ❤️ Support Me
Enjoy my projects? Any support is greatly appreciated!

[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/VenimK)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/venimK)


A modern, cross-platform video/audio downloader desktop application built with Flask and modern web technologies. Features a beautiful glassmorphism UI, real-time download progress, playlist support, and support for 13+ platforms including YouTube, SoundCloud, Bandcamp, Vimeo, TikTok, Twitter/X, Instagram, Facebook, Reddit, Dailymotion, Bilibili, and PeerTube.

![YT-DLP Desktop Screenshot](screenshot.png)

## ✨ Features

### Core
- 🌐 **Multi-Platform Support** - Download from 13+ platforms: YouTube, SoundCloud, Bandcamp, Vimeo, TikTok, Twitter/X, Instagram, Facebook, Reddit, Dailymotion, Bilibili, PeerTube, and more
- 🎨 **Modern Glassmorphism UI** - Beautiful interface with animated backgrounds
- 🌓 **Dark/Light Mode** - Toggle between themes
- 📥 **Real-time Progress** - Live download progress with speed and ETA
- 📝 **Playlist Support** - Download entire playlists or select specific videos
- 🎵 **Audio Extraction** - Download audio only in various formats (MP3, FLAC, AAC, etc.)
- ⌨️ **Keyboard Shortcuts** - Power-user shortcuts (Ctrl+D, Ctrl+Q, Ctrl+Enter)
- 🔒 **Standalone Executable** - No Python installation required (embedded Python)

### Format & Quality
- 🎬 **Format Picker** - Browse every real stream for a video (codec, resolution, FPS, file size) and click to use it — no more guessing quality presets
- 📹 **Multiple Formats** - Presets for 4K, 1080p, 720p, 480p, 360p or fully custom format strings

### Subtitles & Audio Language
- 📋 **Subtitle Picker** - Browse all available subtitle languages with live search; auto-detects manual uploads vs. auto-generated/translatable tracks
- 🌍 **Auto-translated Subtitles** - Download YouTube auto-generated subtitles in any of 100+ supported languages (e.g. Arabic translation of a French video)
- 📌 **Subtitle Embedding** - Embed subtitles as a soft track inside the MP4 file (SRT → mov_text via ffmpeg)
- 🎙️ **Audio Language Picker** - Browse and select alternate audio tracks (e.g. Hindi, Spanish, French dubs) — picks the best quality HLS stream for that language automatically

### Authentication & Privacy
- 🍪 **Cookies from Browser** - Pass your Chrome, Firefox, Safari, Edge, or Brave session to download age-restricted or members-only content

### Download Control
- ✂️ **Clip by Timestamp** - Download only a specific segment of a video (`HH:MM:SS → HH:MM:SS`)
- � **Skip Already Downloaded** - Maintain a download archive so re-running a playlist skips videos you already have
- 🚦 **Speed Limit & Concurrent Fragments** - Control bandwidth usage
- 🛡️ **SponsorBlock Integration** - Auto-remove or mark sponsor segments, intros, outros
- 🔪 **Chapter Splitting** - Split a long video into one file per chapter

### Metadata
- 🖼️ **Metadata & Thumbnails** - Embed ID3 metadata and thumbnails in audio files
- 🔊 **Audio Normalization** - Loudnorm post-processing via ffmpeg

## 🚀 Download

Pre-built executables are available on the [Releases](https://github.com/VenimK/YT-DLP-Desktop/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [yt-dlp-desktop-macos-arm64](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-macos-arm64.zip) |
| Windows | [yt-dlp-desktop-windows-x64.exe](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-windows-x64.exe) |
| Linux | [yt-dlp-desktop-linux-x64](https://github.com/VenimK/YT-DLP-Desktop/releases/download/v1.0.6/yt-dlp-desktop-linux-x64) |

## 🛠️ Installation

### Quick Start

1. Download the appropriate file for your platform from [Releases](https://github.com/VenimK/YT-DLP-Desktop/releases)
2. **macOS**: Unzip the file, then run the executable
   ```bash
   unzip yt-dlp-desktop-macos-arm64.zip
   ./yt-dlp-desktop-macos-arm64
   ```
   **Linux**: Make executable and run
   ```bash
   chmod +x yt-dlp-desktop-linux-x64
   ./yt-dlp-desktop-linux-x64
   ```

The app will open in your browser at `http://localhost:8080`.

### macOS

```bash
# Download and extract
curl -L -o yt-dlp-desktop-macos-arm64.zip https://github.com/VenimK/YT-DLP-Desktop/releases/latest/download/yt-dlp-desktop-macos-arm64.zip
unzip yt-dlp-desktop-macos-arm64.zip
./yt-dlp-desktop-macos-arm64
```

### Windows

1. Download `yt-dlp-desktop-windows-x64.exe`
2. Double-click to run
3. Browser will open automatically

### Linux

```bash
# Download latest release
curl -L -o yt-dlp-desktop https://github.com/VenimK/YT-DLP-Desktop/releases/latest/download/yt-dlp-desktop-linux-x64
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
git clone https://github.com/VenimK/YT-DLP-Desktop.git
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

### Subtitle Download & Embedding

1. Click **Pick** next to "Subtitle Languages"
2. Browse or search the list (Manual = creator-uploaded, Auto = machine-generated/translated)
3. Click a language row — the app auto-enables the correct checkbox and uses browser cookies to avoid YouTube rate limits
4. Keep "Embed Subtitles in File" checked to embed the track inside the MP4

### Format Picker

1. Paste a URL
2. Click **Pick** next to "Video Format"
3. Browse streams grouped by Video+Audio, Video Only, Audio Only
4. Click a row to use that exact format ID; combine IDs manually (e.g. `137+251`)

### Members-Only / Age-Restricted Content

1. Open "Cookies from Browser" in Advanced Options
2. Select the browser where you're logged into the site
3. Download as normal — yt-dlp will use your session cookies

### Clip a Video Segment

1. In Advanced Options, fill in **Clip by Timestamp** (Start → End in `HH:MM:SS`)
2. Only that segment will be downloaded — yt-dlp does not fetch the full file first

### Skip Already Downloaded (Playlist Subscriptions)

1. Check **Skip Already Downloaded** in Advanced Options
2. Run the same playlist URL periodically — videos already in the archive are skipped automatically

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

- Create an [Issue](https://github.com/VenimK/YT-DLP-Desktop/issues) for bug reports
- Start a [Discussion](https://github.com/VenimK/YT-DLP-Desktop/discussions) for questions

---

**Note**: This tool is for personal use only. Please respect copyright laws and YouTube's Terms of Service.
