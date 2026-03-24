import subprocess
import sys
import os
import pytest


SRC_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_app_imports():
    """Test that the main app module can be imported without errors."""
    if SRC_DIR not in sys.path:
        sys.path.insert(0, SRC_DIR)
    import importlib
    app_module = importlib.import_module('app')
    assert hasattr(app_module, 'app'), "Flask app object 'app' must exist in app.py"


def test_yt_dlp_available():
    """Test that yt-dlp is available on PATH or bundled."""
    result = subprocess.run(
        ['yt-dlp', '--version'],
        capture_output=True, text=True, timeout=10
    )
    assert result.returncode == 0, (
        f"yt-dlp not found or returned non-zero: {result.stderr.strip()}"
    )


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
