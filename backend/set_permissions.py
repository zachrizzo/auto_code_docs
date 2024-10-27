# set_permissions.py
import os
import stat
import sys

# Path to the binary in the PyInstaller temp directory
ollama_path = os.path.join(sys._MEIPASS, "ollama/ollama")

if os.path.exists(ollama_path):
    try:
        os.chmod(ollama_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)
    except Exception as e:
        print(f"Warning: Failed to set executable permissions on {ollama_path}: {e}")
