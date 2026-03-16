#!/bin/bash
echo "Starting YT-DLP Desktop Application..."
echo
cd "$(dirname "$0")"
source yt-dlp-web/bin/activate
python main.py
