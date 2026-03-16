# Uninstall YT-DLP Desktop

## Manual Removal

To completely remove YT-DLP Desktop, delete these locations:

### Application Files
```bash
# Default installation location
rm -rf "$HOME/Applications/YT-DLP Desktop"

# Check these common locations
rm -rf "$HOME/Desktop/YT-DLP Desktop"
rm -rf "/Applications/YT-DLP Desktop"
```

### Downloaded Files
Your downloaded videos and audio files remain in whatever directory you ran the application from. To find and remove them:

```bash
# Common locations to check
rm -f "$HOME/Downloads/*.mp3" "$HOME/Downloads/*.mp4" "$HOME/Downloads/*.webm"
rm -f "$HOME/Music/*.mp3" "$HOME/Music/*.m4a"
rm -f "$HOME/Videos/*.mp4" "$HOME/Videos/*.webm"

# Or search for recent files
find "$HOME" -name "*.mp3" -o -name "*.mp4" -o -name "*.webm" -o -name "*.m4a" -mtime -30
```

### Configuration Files (if any)
The application doesn't create configuration files by default, but if you created any:

```bash
rm -f "$HOME/.yt-dlp-desktop.json"
rm -f "$HOME/.config/yt-dlp-desktop.json"
```

## Verification

After removal, verify everything is gone:

```bash
# Check application files
ls -la "$HOME/Applications/" | grep -i "yt-dlp"
ls -la "/Applications/" | grep -i "yt-dlp"

# Check running processes
ps aux | grep -i "yt-dlp"

# Check open ports (should not show 8080 or 9090)
lsof -i :8080 -i :9090
```

## Reinstallation

If you want to reinstall later, simply run the installer again or copy the files from your original deployment package.

## Notes

- The application is completely self-contained and doesn't modify system files
- No Python installation or system dependencies are touched
- Only files you explicitly copied are affected
- Downloaded content is not automatically removed (preserves your files)

## Support

If you encounter any issues with uninstallation, check the original deployment README.md or contact support.