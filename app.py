from flask import Flask, render_template, request, jsonify, send_file, redirect
import subprocess
import os
import json
import re
import threading
import time
import io
import urllib.request

app = Flask(__name__)

# Store download progress for each session
download_progress = {}
download_processes = {}

# Cleanup old downloads after 10 minutes
DOWNLOAD_CLEANUP_TIMEOUT = 600

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
        print(f"Cleaned up download session: {session_id}")

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
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url', '')
    options = data.get('options', {})
    session_id = data.get('session_id')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    cmd = ['yt-dlp', '--newline', '--console-title']
    
    if options.get('format'):
        cmd.extend(['-f', options['format']])
    
    if options.get('output_template'):
        cmd.extend(['-o', options['output_template']])
    else:
        cmd.extend(['-o', '%(title)s.%(ext)s'])
    
    if options.get('extract_audio', False):
        cmd.append('--extract-audio')
    
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

    cmd.append(url)
    
    if not session_id:
        session_id = os.urandom(8).hex()
    
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
            else:
                download_progress[session_id]['status'] = 'error'
                download_progress[session_id]['error'] = f'Process exited with code {process.returncode}'
                download_progress[session_id]['completed_at'] = time.time()
                
        except Exception as e:
            download_progress[session_id]['status'] = 'error'
            download_progress[session_id]['error'] = str(e)
            download_progress[session_id]['completed_at'] = time.time()
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
    
    # Detect auto-generated radio/mix playlists (RDAMVM, RD, etc.)
    # These can have thousands of items, so we limit them
    is_radio_playlist = 'RDAMVM' in url or 'list=RD' in url
    max_items = 50 if is_radio_playlist else 100  # Limit radio to 50, others to 100
    
    # Use yt-dlp to get playlist metadata with limit
    cmd = ['yt-dlp', '--flat-playlist', '--playlist-end', str(max_items), '--dump-json', url]
    
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
        files = []
        # Include video, audio, and subtitle files
        extensions = ('.mp4', '.webm', '.mp3', '.m4a', '.flac', '.wav', '.opus', 
                     '.vtt', '.srt', '.lrc')
        for filename in os.listdir('.'):
            if filename.endswith(extensions):
                file_path = os.path.join('.', filename)
                files.append({
                    'name': filename,
                    'size': os.path.getsize(file_path),
                    'modified': os.path.getmtime(file_path)
                })
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-file/<filename>')
def download_file(filename):
    """Serve a downloaded file"""
    try:
        # Security check: prevent directory traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'error': 'Invalid filename'}), 400

        file_path = os.path.join('.', filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        return send_file(file_path, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download-file/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a downloaded file"""
    try:
        import urllib.parse
        
        # Flask may or may not have decoded the URL - try both
        # First, try the filename as-is
        if '..' in filename or filename.startswith('/') or '\\' in filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        # If the filename contains %, it might still be URL-encoded, so decode it
        if '%' in filename:
            filename = urllib.parse.unquote(filename)
        
        # Security check again after decoding
        if '..' in filename or filename.startswith('/') or '\\' in filename:
            return jsonify({'error': 'Invalid filename'}), 400

        file_path = os.path.join('.', filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        os.remove(file_path)
        return jsonify({
            'success': True,
            'message': f'File "{filename}" deleted successfully'
        })
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
    if not ('youtube.com' in url or 'youtu.be' in url):
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    # Check if this is a playlist URL
    is_playlist = 'playlist?' in url or 'list=' in url
    
    # For playlists, get first item; for videos, use --no-playlist
    no_playlist_flag = ['--no-playlist'] if not is_playlist else []
    cmd = ['yt-dlp', '--dump-json', '--no-download', '--skip-download'] + no_playlist_flag + [url]
    
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


@app.route('/thumbnail-proxy')
def thumbnail_proxy():
    """Proxy thumbnail requests to avoid CORS issues"""
    import urllib.request
    thumbnail_url = request.args.get('url')
    
    if not thumbnail_url:
        return jsonify({'error': 'URL parameter required'}), 400
    
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
        
        for url in urls_to_try:
            try:
                # Fetch the thumbnail with proper headers
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.youtube.com/'
                })
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = response.read()
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    
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
        print(f"Thumbnail proxy error: {e}")
        # Return a redirect to the original URL as fallback
        return redirect(thumbnail_url, code=302)

@app.route('/server-settings', methods=['POST'])
def save_server_settings():
    """Save server settings to config file"""
    data = request.json
    port = data.get('serverPort')
    
    if not port or not isinstance(port, int) or port < 1024 or port > 65535:
        return jsonify({'error': 'Invalid port number. Must be between 1024 and 65535.'}), 400
    
    config_dir = os.path.expanduser('~/.yt-dlp-desktop')
    config_path = os.path.join(config_dir, 'config.json')
    
    try:
        # Create config directory if it doesn't exist
        os.makedirs(config_dir, exist_ok=True)
        
        # Read existing config or create new
        config = {}
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
        
        # Update server port
        config['serverPort'] = port
        
        # Save config
        with open(config_path, 'w') as f:
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
    config_path = os.path.expanduser('~/.yt-dlp-desktop/config.json')
    
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
        except Exception as e:
            return jsonify({'error': f'Failed to read config: {str(e)}'}), 500
    
    return jsonify({
        'serverPort': config.get('serverPort', int(os.getenv('PORT', 8080))),
        'configPath': config_path
    })

if __name__ == '__main__':
    import socket
    import sys
    
    # Check for config file first, then env var, then default
    config_port = None
    config_path = os.path.expanduser('~/.yt-dlp-desktop/config.json')
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                config_port = config.get('serverPort')
        except Exception as e:
            print(f"Could not read config file: {e}")
    
    # Get preferred port
    preferred_port = config_port or int(os.getenv('PORT', 8080))
    
    def is_port_available(port):
        """Check if a port is available"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return True
            except socket.error:
                return False
    
    # Try preferred port first, then fall back to 8080-8090
    ports_to_try = [preferred_port] + list(range(8080, 8091))
    # Remove duplicates while preserving order
    ports_to_try = list(dict.fromkeys(ports_to_try))
    
    port = None
    for p in ports_to_try:
        if is_port_available(p):
            port = p
            break
    
    if port is None:
        print("\n" + "="*60)
        print("ERROR: Could not find an available port!")
        print("="*60)
        print(f"\nTried ports: {ports_to_try}")
        print("\nTo fix this, you can:")
        print("1. Stop other applications using ports 8080-8090")
        print("2. Set a custom port: export PORT=9090 && python app.py")
        print(f"3. Delete config file: rm {config_path}")
        print("\n" + "="*60)
        sys.exit(1)
    
    if port != preferred_port:
        print(f"\n⚠️  Port {preferred_port} is already in use.")
        print(f"✓  Starting server on available port: {port}\n")
    else:
        print(f"Starting server on port {port}...")
    
    app.run(host='0.0.0.0', port=port)