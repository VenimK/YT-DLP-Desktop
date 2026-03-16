#!/usr/bin/env python3
"""
YT-DLP Desktop Application
Runs the Flask web server locally and opens the browser
"""
import os
import sys
import threading
import webbrowser
import time
import subprocess
from app import app

def check_yt_dlp():
    """Check if yt-dlp is installed"""
    try:
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ yt-dlp version: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"⚠️  Error checking yt-dlp: {e}")
    
    print("❌ yt-dlp is not installed or not found in PATH")
    print("Please install yt-dlp:")
    print("  pip install yt-dlp")
    print("  or visit: https://github.com/yt-dlp/yt-dlp#installation")
    return False

def open_browser():
    """Open browser after server starts"""
    time.sleep(2)  # Wait for server to start
    webbrowser.open('http://localhost:8080')

def main():
    """Main application entry point"""
    print("🚀 Starting YT-DLP Desktop Application...")
    
    # Check yt-dlp installation
    if not check_yt_dlp():
        sys.exit(1)
    
    print("📁 Downloads will be saved to:", os.path.abspath('.'))
    print("🌐 Opening web interface at http://localhost:8080")
    print("⏹️  Press Ctrl+C to stop the application")
    print("-" * 50)
    
    # Start browser in background thread
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Run Flask app
    app.run(host='0.0.0.0', port=8080, debug=False)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Application stopped")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)