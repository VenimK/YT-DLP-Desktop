import os
import sys
import signal
import atexit

# Suppress Flask's .env warning
os.environ['FLASK_SKIP_DOTENV'] = '1'

from flask import Flask, render_template, request, jsonify, send_file, make_response
import subprocess
import json
import re
import threading
import time
import io
import ssl
import urllib.request
import urllib.parse
import webbrowser
import socket

app = Flask(__name__)

# ── Structured Logger ──────────────────────────────────────────────
from datetime import datetime

_LOG_COLORS = {
    'SERVER':   '\033[96m',   # cyan
    'SEARCH':   '\033[93m',   # yellow
    'DOWNLOAD': '\033[92m',   # green
    'PLAYER':   '\033[95m',   # magenta
    'UPDATE':   '\033[94m',   # blue
    'CLEANUP':  '\033[90m',   # gray
    'ERROR':    '\033[91m',   # red
    'INFO':     '\033[97m',   # white
}
_LOG_RESET = '\033[0m'

def log(tag, message):
    """Print a structured log line: HH:MM:SS [TAG] message"""
    ts = datetime.now().strftime('%H:%M:%S')
    color = _LOG_COLORS.get(tag, _LOG_RESET)
    padded = tag.ljust(8)
    print(f"{ts} {color}[{padded}]{_LOG_RESET} {message}", flush=True)

# ── State ──────────────────────────────────────────────────────────

# Store download progress for each session
download_progress = {}
download_processes = {}

# Cleanup old downloads after 10 minutes
DOWNLOAD_CLEANUP_TIMEOUT = 600
THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024

APP_DIR = os.path.expanduser('~/.yt-dlp-desktop')
DOWNLOADS_DIR = os.path.join(APP_DIR, 'downloads')
CONFIG_PATH = os.path.join(APP_DIR, 'config.json')
AUTH_COOKIE_NAME = 'yt_dlp_desktop_auth'
SESSION_TOKEN = os.urandom(24).hex()

ALLOWED_YOUTUBE_HOSTS = {
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
}

ALLOWED_THUMBNAIL_HOSTS = {
    'img.youtube.com',
}


def _get_bundled_yt_dlp_path():
    """Return the bundled yt-dlp path for frozen builds, if present."""
    if not getattr(sys, 'frozen', False):
        return None

    bundle_dir = sys._MEIPASS if hasattr(sys, '_MEIPASS') else os.path.dirname(sys.executable)
    bundled = os.path.join(bundle_dir, 'bin', 'yt-dlp')
    if sys.platform == 'win32':
        bundled += '.exe'
    if os.path.exists(bundled):
        return bundled
    return None


def _get_yt_dlp_executable():
    """Prefer the bundled yt-dlp in packaged builds; otherwise use PATH."""
    bundled = _get_bundled_yt_dlp_path()
    if bundled:
        bundle_bin = os.path.dirname(bundled)
        os.environ['PATH'] = bundle_bin + os.pathsep + os.environ.get('PATH', '')
        return bundled
    return 'yt-dlp'


def _ensure_app_dirs():
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)


def _is_allowed_youtube_url(url):
    """Allow only normal YouTube watch/playlist/share URLs."""
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False

    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        return False

    host = parsed.hostname.lower()
    return host in ALLOWED_YOUTUBE_HOSTS or host.endswith('.youtube.com')


def _is_allowed_thumbnail_url(url):
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False

    if parsed.scheme != 'https' or not parsed.hostname:
        return False

    host = parsed.hostname.lower()
    return host in ALLOWED_THUMBNAIL_HOSTS or host.endswith('.ytimg.com')


def _resolve_download_path(filename):
    """Resolve a requested file path underneath the dedicated downloads directory."""
    _ensure_app_dirs()

    if not filename:
        raise ValueError('Filename is required')

    if '%' in filename:
        filename = urllib.parse.unquote(filename)

    drive, _ = os.path.splitdrive(filename)
    if filename.startswith(('/', '\\')) or drive:
        raise ValueError('Invalid filename')

    resolved = os.path.realpath(os.path.join(DOWNLOADS_DIR, filename))
    base_dir = os.path.realpath(DOWNLOADS_DIR)

    if not resolved.startswith(base_dir + os.sep) and resolved != base_dir:
        raise ValueError('Invalid filename')

    return resolved, os.path.relpath(resolved, base_dir)


def _build_output_template(template):
    _ensure_app_dirs()

    template = (template or '%(title)s.%(ext)s').strip()
    drive, _ = os.path.splitdrive(template)

    if not template:
        template = '%(title)s.%(ext)s'
    if drive or '/' in template or '\\' in template:
        raise ValueError('Output template must stay inside the app downloads directory')

    return os.path.join(DOWNLOADS_DIR, template)


@app.before_request
def require_local_session():
    """Only the locally served UI may use API routes."""
    if request.endpoint in ('index', 'static'):
        return None
    if request.path == '/favicon.ico':
        return None
    if request.cookies.get(AUTH_COOKIE_NAME) != SESSION_TOKEN:
        return jsonify({'error': 'Unauthorized'}), 401
    return None

def cleanup_old_downloads():
    """Remove old completed/failed downloads from memory"""
    current_time = time.time()
    sessions_to_remove = []
    
    for session_id, data in download_progress.items():
        # Remove completed downloads after timeout
        if data.get('status') in ('completed', 'error'):
            completed_time = data.get('completed_at', 0)
            if completed_time and (current_time - completed_time) > DOWNLOAD_CLEANUP_TIMEOUT:
                sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        download_progress.pop(session_id, None)
        download_processes.pop(session_id, None)
        log('CLEANUP', f"Removed session {session_id}")

def parse_yt_dlp_progress(line):
    """Parse yt-dlp progress output"""
    patterns = [
        r'\[download\]\s+(\d+\.\d+)% of\s+~?\s*(\d+\.\d+)([KMGT]i?B)?.*?ETA (\d+:\d+)',
        r'\[download\]\s+(\d+\.\d+)%.*?ETA (\d+:\d+)',
        r'\[download\]\s+([\w\s.-]+) has already been downloaded',
        r'\[download\]\s+Destination: ([\w\s.-]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            if 'has already been downloaded' in line:
                return {'status': 'completed', 'filename': match.group(1)}
            elif 'Destination:' in line:
                return {'status': 'started', 'filename': match.group(1)}
            elif len(match.groups()) >= 4:
                return {
                    'progress': float(match.group(1)),
                    'size': match.group(2) + (match.group(3) or ''),
                    'eta': match.group(4),
                    'status': 'downloading'
                }
            elif len(match.groups()) >= 2:
                return {
                    'progress': float(match.group(1)),
                    'eta': match.group(2),
                    'status': 'downloading'
                }
    
    if '100%' in line and 'download' in line:
        return {'progress': 100, 'status': 'completed'}
    
    return None

@app.route('/')
def index():
    response = make_response(render_template('index.html'))
    response.set_cookie(
        AUTH_COOKIE_NAME,
        SESSION_TOKEN,
        httponly=True,
        samesite='Strict',
        secure=False,
        path='/',
    )
    return response

@app.route('/search', methods=['POST'])
def search_youtube():
    """Search YouTube via yt-dlp"""
    data = request.json
    query = data.get('query', '').strip()
    max_results = min(int(data.get('max_results', 10)), 20)
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    cmd = [_get_yt_dlp_executable(), '--dump-json', '--flat-playlist', '--no-download',
           f'ytsearch{max_results}:{query}']
    
    log('SEARCH', f'"{query}" (max {max_results})')
    search_start = time.time()
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            log('ERROR', f'Search failed: {result.stderr[:100]}')
            return jsonify({'error': 'Search failed', 'details': result.stderr[:200]}), 500
        
        results = []
        for line in result.stdout.strip().split('\n'):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                results.append({
                    'id': item.get('id'),
                    'title': item.get('title'),
                    'channel': item.get('channel') or item.get('uploader'),
                    'duration': item.get('duration'),
                    'view_count': item.get('view_count'),
                    'thumbnail': f"https://i.ytimg.com/vi/{item.get('id')}/mqdefault.jpg" if item.get('id') else None,
                    'url': item.get('url') or item.get('webpage_url') or f"https://www.youtube.com/watch?v={item.get('id')}"
                })
            except json.JSONDecodeError:
                continue
        
        elapsed = time.time() - search_start
        log('SEARCH', f'"{query}" → {len(results)} results ({elapsed:.1f}s)')
        return jsonify({'results': results})
    except subprocess.TimeoutExpired:
        log('ERROR', f'Search timed out: "{query}"')
        return jsonify({'error': 'Search timed out'}), 500
    except Exception as e:
        log('ERROR', f'Search error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/stream/<path:filename>')
def stream_file(filename):
    """Stream an audio/video file for the built-in player"""
    try:
        resolved, safe_name = _resolve_download_path(filename)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    if not os.path.exists(resolved):
        return jsonify({'error': 'File not found'}), 404
    
    log('PLAYER', f'Streaming: {safe_name}')
    return send_file(resolved, conditional=True)

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url', '')
    options = data.get('options', {})
    session_id = data.get('session_id')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    if not _is_allowed_youtube_url(url):
        return jsonify({'error': 'Only YouTube URLs are allowed'}), 400
    
    cmd = [_get_yt_dlp_executable(), '--newline', '--console-title']
    
    if options.get('extract_audio', False):
        # When extracting audio only, use bestaudio format to avoid downloading video
        cmd.extend(['-f', 'bestaudio/best'])
        cmd.append('--extract-audio')
    elif options.get('format'):
        cmd.extend(['-f', options['format']])
    
    try:
        output_template = _build_output_template(options.get('output_template'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    cmd.extend(['-o', output_template])
    
    if options.get('audio_format'):
        cmd.extend(['--audio-format', options['audio_format']])
    
    if options.get('audio_quality'):
        cmd.extend(['--audio-quality', options['audio_quality']])
    
    # Playlist options
    if options.get('playlist_items'):
        cmd.extend(['--playlist-items', options['playlist_items']])
    
    if options.get('max_downloads'):
        cmd.extend(['--max-downloads', str(options['max_downloads'])])
    
    if options.get('flat_playlist', False):
        cmd.append('--flat-playlist')
    
    if options.get('playlist_random', False):
        cmd.append('--playlist-random')

    if not options.get('write_playlist_meta', True):
        cmd.append('--no-write-playlist-metafiles')

    # Thumbnail and metadata options
    if options.get('embed_thumbnail', False):
        cmd.append('--embed-thumbnail')

    if options.get('embed_metadata', False):
        cmd.append('--embed-metadata')

    if options.get('write_thumbnail', False):
        cmd.append('--write-thumbnail')

    # Subtitle options
    if options.get('write_subs', False):
        cmd.append('--write-subs')
        if options.get('sub_langs'):
            cmd.extend(['--sub-langs', options['sub_langs']])

    if options.get('write_auto_subs', False):
        cmd.append('--write-auto-subs')

    # Download control options
    if options.get('limit_rate'):
        cmd.extend(['--limit-rate', options['limit_rate']])

    if options.get('retries'):
        cmd.extend(['--retries', str(options['retries'])])

    if options.get('concurrent_fragments'):
        cmd.extend(['--concurrent-fragments', str(options['concurrent_fragments'])])

    # Age restriction
    if options.get('age_limit'):
        cmd.extend(['--age-limit', str(options['age_limit'])])

    # No playlist option
    if options.get('no_playlist', False):
        cmd.append('--no-playlist')

    # SponsorBlock - remove sponsor segments
    if options.get('sponsorblock', False):
        categories = options.get('sponsorblock_categories', 'sponsor,selfpromo,interaction,intro,outro')
        cmd.extend(['--sponsorblock-remove', categories])

    # Chapter splitting
    if options.get('split_chapters', False):
        cmd.append('--split-chapters')

    # Audio normalization via ffmpeg loudnorm
    if options.get('normalize_audio', False):
        cmd.extend(['--postprocessor-args', 'ffmpeg:-af loudnorm=I=-16:TP=-1.5:LRA=11'])

    cmd.append(url)
    
    if not session_id:
        session_id = os.urandom(8).hex()
    
    # Log download details
    opt_summary = ', '.join(f'{k}={v}' for k, v in options.items() if v and k not in ('format', 'output_template'))
    log('DOWNLOAD', f'Started (session: {session_id[:8]})')
    log('DOWNLOAD', f'URL: {url}')
    log('DOWNLOAD', f'Command: {" ".join(cmd)}')
    if opt_summary:
        log('DOWNLOAD', f'Options: {opt_summary}')
    
    # Cleanup old downloads before starting new one
    cleanup_old_downloads()
    
    download_progress[session_id] = {
        'status': 'starting',
        'progress': 0,
        'filename': '',
        'eta': '--:--',
        'speed': '0 KB/s',
        'output': []
    }
    
    def run_download():
        dl_start = time.time()
        process = None
        try:
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                universal_newlines=True,
                bufsize=1
            )
            
            # Store process reference for cancellation
            download_processes[session_id] = process
            
            download_progress[session_id]['status'] = 'running'
            
            if process.stdout:
                for line in process.stdout:
                    download_progress[session_id]['output'].append(line.strip())
                    
                    # Parse progress information
                    progress_info = parse_yt_dlp_progress(line)
                    if progress_info:
                        if 'progress' in progress_info:
                            download_progress[session_id]['progress'] = progress_info['progress']
                        if 'eta' in progress_info:
                            download_progress[session_id]['eta'] = progress_info['eta']
                        if 'filename' in progress_info:
                            download_progress[session_id]['filename'] = progress_info['filename']
                        if 'status' in progress_info:
                            download_progress[session_id]['status'] = progress_info['status']
                        
                        # Parse actual speed from yt-dlp output if available
                        speed_match = re.search(r'at\s+([\d.]+\s*[KMGT]i?B/s)', line)
                        if speed_match:
                            download_progress[session_id]['speed'] = speed_match.group(1)
            
            process.wait()
            
            if process.returncode == 0:
                download_progress[session_id]['status'] = 'completed'
                download_progress[session_id]['progress'] = 100
                download_progress[session_id]['completed_at'] = time.time()
                elapsed = time.time() - dl_start
                fname = download_progress[session_id].get('filename', '?')
                log('DOWNLOAD', f'Completed: {fname} ({elapsed:.1f}s, session: {session_id[:8]})')
            else:
                download_progress[session_id]['status'] = 'error'
                download_progress[session_id]['error'] = f'Process exited with code {process.returncode}'
                download_progress[session_id]['completed_at'] = time.time()
                log('ERROR', f'Download failed (session: {session_id[:8]}): exit code {process.returncode}')
                
        except Exception as e:
            download_progress[session_id]['status'] = 'error'
            download_progress[session_id]['error'] = str(e)
            download_progress[session_id]['completed_at'] = time.time()
            log('ERROR', f'Download exception (session: {session_id[:8]}): {e}')
        finally:
            # Remove process reference
            download_processes.pop(session_id, None)
    
    # Run download in background thread
    thread = threading.Thread(target=run_download)
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True, 
        'session_id': session_id,
        'message': 'Download started in background'
    })

@app.route('/progress/<session_id>')
def get_progress(session_id):
    if session_id not in download_progress:
        return jsonify({'error': 'Invalid session ID'}), 404
    
    progress_data = download_progress[session_id]
    return jsonify(progress_data)

@app.route('/cancel/<session_id>', methods=['POST'])
def cancel_download(session_id):
    """Cancel an active download"""
    if session_id not in download_progress:
        return jsonify({'error': 'Invalid session ID'}), 404
    
    # Get the process
    process = download_processes.get(session_id)
    
    if process and process.poll() is None:
        # Process is still running, terminate it
        log('DOWNLOAD', f'Cancelling (session: {session_id[:8]})')
        try:
            process.terminate()
            # Wait a bit for graceful termination
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate gracefully
                process.kill()
                process.wait()
            
            download_progress[session_id]['status'] = 'cancelled'
            download_progress[session_id]['completed_at'] = time.time()
            download_processes.pop(session_id, None)
            
            return jsonify({'success': True, 'message': 'Download cancelled'})
        except Exception as e:
            return jsonify({'error': f'Failed to cancel: {str(e)}'}), 500
    else:
        # Process already finished or not found
        return jsonify({'error': 'Download not active or already completed'}), 400

@app.route('/playlist-metadata', methods=['POST'])
def get_playlist_metadata():
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    if not _is_allowed_youtube_url(url):
        return jsonify({'error': 'Only YouTube playlist URLs are allowed'}), 400
    
    # Detect auto-generated radio/mix playlists (RDAMVM, RD, RDCLAK, etc.)
    # These can have thousands of items, so we limit them
    is_radio_playlist = any(prefix in url for prefix in ['RDAMVM', 'list=RD', 'RDCLAK'])
    max_items = 50 if is_radio_playlist else 100  # Limit radio to 50, others to 100
    
    # Use yt-dlp to get playlist metadata with limit
    cmd = [_get_yt_dlp_executable(), '--flat-playlist', '--playlist-end', str(max_items), '--dump-json', url]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            # Parse JSON output from yt-dlp
            videos = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    try:
                        video_data = json.loads(line)
                        videos.append({
                            'id': video_data.get('id'),
                            'title': video_data.get('title'),
                            'duration': video_data.get('duration'),
                            'index': video_data.get('playlist_index'),
                            'url': video_data.get('webpage_url')
                        })
                    except json.JSONDecodeError:
                        continue
            
            # Add warning for radio playlists
            response = {'videos': videos}
            if is_radio_playlist and len(videos) >= max_items:
                response['warning'] = f'Auto-generated playlist limited to first {max_items} items (original has more)'
                response['is_radio'] = True
            
            return jsonify(response)
        else:
            return jsonify({'error': result.stderr}), 500
            
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Playlist metadata fetch timed out'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/downloads')
def list_downloads():
    """List all downloaded files"""
    try:
        _ensure_app_dirs()
        files = []
        # Include video, audio, and subtitle files
        extensions = ('.mp4', '.webm', '.mp3', '.m4a', '.flac', '.wav', '.opus', 
                     '.vtt', '.srt', '.lrc')
        for filename in os.listdir(DOWNLOADS_DIR):
            if filename.endswith(extensions):
                file_path = os.path.join(DOWNLOADS_DIR, filename)
                files.append({
                    'name': filename,
                    'size': os.path.getsize(file_path),
                    'modified': os.path.getmtime(file_path)
                })
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-file/<path:filename>')
def download_file(filename):
    """Serve a downloaded file"""
    try:
        file_path, safe_name = _resolve_download_path(filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_file(file_path, as_attachment=True, download_name=safe_name)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-file/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a downloaded file"""
    try:
        resolved, safe_name = _resolve_download_path(filename)
        if not os.path.exists(resolved):
            return jsonify({'error': 'File not found'}), 404

        os.remove(resolved)
        return jsonify({
            'success': True,
            'message': f'File "{safe_name}" deleted successfully'
        })
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/video-info', methods=['POST'])
def get_video_info():
    """Get video metadata for preview"""
    data = request.json
    url = data.get('url', '')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Validate URL format
    if not _is_allowed_youtube_url(url):
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    # Check if this is a playlist URL
    is_playlist = 'playlist?' in url or 'list=' in url
    
    # For playlists, only get first item for preview; for videos, use --no-playlist
    if is_playlist:
        playlist_flag = ['--playlist-items', '1']
    else:
        playlist_flag = ['--no-playlist']
    cmd = [_get_yt_dlp_executable(), '--dump-json', '--no-download', '--skip-download'] + playlist_flag + [url]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and result.stdout:
            try:
                # Get first line and parse JSON
                lines = result.stdout.strip().split('\n')
                if not lines or not lines[0]:
                    return jsonify({'error': 'No video data returned'}), 500
                    
                video_data = json.loads(lines[0])
                
                # Get the best thumbnail available
                thumbnail = video_data.get('thumbnail')
                if not thumbnail and video_data.get('thumbnails'):
                    # Try to get the highest quality thumbnail
                    thumbnails = video_data['thumbnails']
                    if thumbnails:
                        # Get last thumbnail (usually highest res) or try to find maxres
                        if isinstance(thumbnails, list) and len(thumbnails) > 0:
                            # Prefer maxresdefault if available
                            maxres = [t for t in thumbnails if 'maxres' in str(t.get('url', ''))]
                            if maxres:
                                thumbnail = maxres[0].get('url')
                            else:
                                thumbnail = thumbnails[-1].get('url')
                        else:
                            thumbnail = thumbnails
                
                # Also try to get thumbnail from video ID if still no thumbnail
                if not thumbnail and video_data.get('id'):
                    video_id = video_data.get('id')
                    thumbnail = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                
                # Get available formats for quality selection
                formats = []
                if video_data.get('formats'):
                    seen_heights = set()
                    for f in video_data['formats']:
                        if f.get('vcodec') != 'none' and f.get('height'):
                            height = f.get('height')
                            if height not in seen_heights:
                                seen_heights.add(height)
                                formats.append({
                                    'height': height,
                                    'ext': f.get('ext', 'mp4'),
                                    'format_id': f.get('format_id')
                                })
                    # Sort by height descending
                    formats = sorted(formats, key=lambda x: x['height'], reverse=True)[:5]
                
                # Get upload date formatted
                upload_date = video_data.get('upload_date')
                if upload_date and len(upload_date) == 8:
                    upload_date = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:]}"
                
                return jsonify({
                    'id': video_data.get('id'),
                    'title': video_data.get('title'),
                    'channel': video_data.get('channel') or video_data.get('uploader') or video_data.get('uploader_id'),
                    'channel_url': video_data.get('channel_url'),
                    'duration': video_data.get('duration'),
                    'thumbnail': thumbnail,
                    'description': video_data.get('description', '')[:300] + '...' if video_data.get('description') else None,
                    'view_count': video_data.get('view_count'),
                    'like_count': video_data.get('like_count'),
                    'upload_date': upload_date,
                    'formats': formats,
                    'original_url': video_data.get('webpage_url') or url,
                    'is_playlist': is_playlist
                })
            except json.JSONDecodeError as e:
                return jsonify({'error': f'Failed to parse video data: {str(e)}'}), 500
        else:
            error_msg = result.stderr[:200] if result.stderr else 'Unknown error'
            return jsonify({'error': f'yt-dlp error: {error_msg}'}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Request timed out (30s)'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


def _get_ssl_context():
    """Get an SSL context that works in PyInstaller bundles"""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

@app.route('/thumbnail-proxy')
def thumbnail_proxy():
    """Proxy thumbnail requests to avoid CORS issues"""
    thumbnail_url = request.args.get('url')
    
    if not thumbnail_url:
        return jsonify({'error': 'URL parameter required'}), 400

    if not _is_allowed_thumbnail_url(thumbnail_url):
        return jsonify({'error': 'Invalid thumbnail URL'}), 400
    
    try:
        # For YouTube thumbnails, try to get a better format
        if 'i.ytimg.com' in thumbnail_url:
            # Try hqdefault first if maxres fails
            if 'maxresdefault' in thumbnail_url:
                fallback_url = thumbnail_url.replace('maxresdefault', 'hqdefault')
            else:
                fallback_url = None
        else:
            fallback_url = None
        
        # Try main URL first
        urls_to_try = [thumbnail_url]
        if fallback_url:
            urls_to_try.append(fallback_url)
        
        ssl_ctx = _get_ssl_context()
        
        for url in urls_to_try:
            try:
                # Fetch the thumbnail with proper headers
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/'
                })
                
                with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as response:
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    if not content_type.startswith('image/'):
                        return jsonify({'error': 'Invalid thumbnail response'}), 400
                    data = response.read(THUMBNAIL_MAX_BYTES + 1)
                    if len(data) > THUMBNAIL_MAX_BYTES:
                        return jsonify({'error': 'Thumbnail too large'}), 413
                    
                return send_file(
                    io.BytesIO(data),
                    mimetype=content_type,
                    as_attachment=False
                )
            except urllib.error.HTTPError as e:
                # If 404 on first URL, try fallback
                if e.code == 404 and url == thumbnail_url and fallback_url:
                    continue
                raise
                
    except Exception as e:
        log('ERROR', f'Thumbnail proxy: {e}')
        return jsonify({'error': 'Failed to fetch thumbnail'}), 502

@app.route('/server-settings', methods=['POST'])
def save_server_settings():
    """Save server settings to config file"""
    data = request.json
    port = data.get('serverPort')
    
    if not port or not isinstance(port, int) or port < 1024 or port > 65535:
        return jsonify({'error': 'Invalid port number. Must be between 1024 and 65535.'}), 400

    try:
        # Create config directory if it doesn't exist
        os.makedirs(APP_DIR, exist_ok=True)
        
        # Read existing config or create new
        config = {}
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
        
        # Update server port
        config['serverPort'] = port
        
        # Save config
        with open(CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'Server port saved: {port}. Restart the server to apply changes.',
            'port': port
        })
    except Exception as e:
        return jsonify({'error': f'Failed to save settings: {str(e)}'}), 500

@app.route('/server-settings', methods=['GET'])
def get_server_settings():
    """Get current server settings from config file"""
    config = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
        except Exception as e:
            return jsonify({'error': f'Failed to read config: {str(e)}'}), 500
    
    return jsonify({
        'serverPort': config.get('serverPort', int(os.getenv('PORT', 8080))),
        'configPath': CONFIG_PATH
    })

def _cleanup_processes():
    """Kill all running download subprocesses on exit"""
    for sid, proc in list(download_processes.items()):
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

def _shutdown(signum=None, frame=None):
    """Clean shutdown handler"""
    log('SERVER', 'Shutting down...')
    _cleanup_processes()
    os._exit(0)

def _is_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return True
        except socket.error:
            return False

def _check_yt_dlp():
    """Check if yt-dlp is available"""
    bundled = _get_bundled_yt_dlp_path()
    if bundled:
        try:
            result = subprocess.run([bundled, '--version'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass

    try:
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return result.stdout.strip()
    except FileNotFoundError:
        pass
    except Exception:
        pass

    return None

def _open_browser(port):
    """Open browser after a short delay"""
    time.sleep(1.5)
    webbrowser.open(f'http://localhost:{port}')

def _check_yt_dlp_update(current_version):
    """Check if a newer version of yt-dlp is available (non-blocking)"""
    try:
        req = urllib.request.Request(
            'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
            headers={'User-Agent': 'YT-DLP-Desktop/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5, context=_get_ssl_context()) as resp:
            data = json.loads(resp.read().decode())
            latest = data.get('tag_name', '').strip()
            if latest and latest != current_version:
                log('UPDATE', f'yt-dlp {current_version} → {latest} available! Run: yt-dlp -U')
                return latest
            else:
                log('UPDATE', f'yt-dlp {current_version} ✓ (up to date)')
                return None
    except Exception as e:
        log('UPDATE', f'Could not check for updates: {e}')
        return None

# Store latest version info for the API endpoint
_update_info = {'current': None, 'latest': None, 'checked': False}

@app.route('/check-update')
def check_update():
    """Return yt-dlp version and update status"""
    return jsonify(_update_info)

if __name__ == '__main__':
    # Register signal handlers for clean shutdown
    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)
    if hasattr(signal, 'SIGHUP'):  # Unix only
        signal.signal(signal.SIGHUP, _shutdown)
    atexit.register(_cleanup_processes)
    
    # Startup banner
    print("=" * 50)
    print("  YT-DLP Desktop")
    print("=" * 50)
    
    # Check yt-dlp
    yt_dlp_version = _check_yt_dlp()
    if yt_dlp_version:
        log('SERVER', f'yt-dlp version: {yt_dlp_version}')
        _update_info['current'] = yt_dlp_version
    else:
        log('ERROR', 'yt-dlp not found! Install it: pip install yt-dlp')
    
    _ensure_app_dirs()
    log('SERVER', f'Downloads dir: {DOWNLOADS_DIR}')
    
    # Check for yt-dlp updates in background
    if yt_dlp_version:
        def _bg_update_check():
            latest = _check_yt_dlp_update(yt_dlp_version)
            _update_info['latest'] = latest
            _update_info['checked'] = True
        update_thread = threading.Thread(target=_bg_update_check, daemon=True)
        update_thread.start()
    
    # Determine port
    config_port = None
    
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
                config_port = config.get('serverPort')
        except Exception:
            pass
    
    preferred_port = config_port or int(os.getenv('PORT', 8080))
    
    # Try preferred port first, then fall back to 8080-8090
    ports_to_try = [preferred_port] + list(range(8080, 8091))
    ports_to_try = list(dict.fromkeys(ports_to_try))
    
    port = None
    for p in ports_to_try:
        if _is_port_available(p):
            port = p
            break
    
    if port is None:
        log('ERROR', f'No available port found! Tried: {ports_to_try}')
        log('ERROR', 'Fix: stop apps using those ports or set PORT env var')
        sys.exit(1)
    
    if port != preferred_port:
        log('SERVER', f'Port {preferred_port} in use, using: {port}')
    
    url = f"http://localhost:{port}"
    log('SERVER', f'URL: {url}')
    print("=" * 50)
    log('SERVER', 'Press Ctrl+C to stop')
    print("=" * 50)
    
    # Auto-open browser
    browser_thread = threading.Thread(target=_open_browser, args=(port,), daemon=True)
    browser_thread.start()
    
    # Suppress Flask's default startup banner but route requests through our logger
    import logging as _logging
    
    class _RequestFilter(_logging.Filter):
        """Route werkzeug request logs through our structured logger"""
        def filter(self, record):
            msg = record.getMessage()
            # Filter out Flask startup noise
            if 'Serving Flask app' in msg or 'Debug mode' in msg or 'WARNING: This is a development server' in msg or 'Use a production WSGI server' in msg or 'Press CTRL+C to quit' in msg:
                return False
            # Skip noisy requests (static files, polling, thumbnails)
            if '/static/' in msg or '/favicon' in msg or '/thumbnail-proxy' in msg or '/progress/' in msg or 'GET /downloads' in msg or '/download-file/' in msg or '/stream/' in msg or '/server-settings' in msg or '/check-update' in msg:
                return False
            # Route HTTP request logs through our logger
            if record.levelno <= _logging.INFO:
                log('SERVER', msg.strip())
                return False
            return True
    
    werkzeug_log = _logging.getLogger('werkzeug')
    werkzeug_log.addFilter(_RequestFilter())
    
    # Suppress click echo (Flask banner)
    import click
    _orig_echo = click.echo
    _orig_secho = click.secho
    def secho(text, **kwargs):
        pass
    def echo(text, **kwargs):
        pass
    click.echo = echo
    click.secho = secho
    
    app.run(host='127.0.0.1', port=port)
