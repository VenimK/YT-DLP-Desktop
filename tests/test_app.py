import subprocess
import sys
import os

def test_app_imports():
    """Test that the main app can be imported without errors"""
    try:
        # Add parent directory to path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        import app
        assert hasattr(app, 'app'), "Flask app should exist"
        print("✅ App imports successfully")
        return True
    except Exception as e:
        print(f"❌ App import failed: {e}")
        return False

def test_yt_dlp_available():
    """Test that yt-dlp is available"""
    try:
        result = subprocess.run(['yt-dlp', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ yt-dlp available: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ yt-dlp not available: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ yt-dlp test failed: {e}")
        return False

if __name__ == "__main__":
    success = True
    success = test_app_imports() and success
    success = test_yt_dlp_available() and success
    
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)
