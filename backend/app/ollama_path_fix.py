import os
import shutil
import logging
import platform
from pathlib import Path
import sys
from dotenv import load_dotenv


load_dotenv(dotenv_path='/Users/zachrizzo/programing/auto_code_docs_app/.env')

def get_ollama_path(isProd=False):
    """
    Get the Ollama binary path based on the environment (dev/prod) and platform.

    Args:
        isProd (bool): Whether running in production mode
    Returns:
        str: Path to the Ollama binary
    """
    logging.info(f"Getting Ollama path for {'production' if isProd else 'development'} mode")

    if isProd:
        # Production environment
        if platform.system() == 'Darwin':  # macOS
            if getattr(sys, 'frozen', False):
                # Running in a PyInstaller bundle
                app_path = Path(os.path.dirname(sys.executable)).parent
                ollama_path = app_path / 'Resources' / 'ollama' / 'ollama'
            else:
                # Running in production mode but not bundled
                app_path = Path(__file__).parent.parent.parent
                ollama_path = app_path / 'Resources' / 'ollama' / 'ollama'
        else:
            # Add paths for other platforms as needed
            raise NotImplementedError(f"Platform {platform.system()} not supported yet in production mode")
    else:

        ollama_path = os.getenv('OLLAMA_PATH')
        print(ollama_path)
        if not ollama_path:
            raise FileNotFoundError("Ollama binary not found in system PATH. Please install Ollama and ensure it is accessible.")
        ollama_path = Path(ollama_path)

    logging.info(f"Using Ollama binary at: {ollama_path}")
    return str(ollama_path)

def ensure_binary_exists(isProd=False):
    """
    Ensure the Ollama binary is available and return its path.

    Args:
        isProd (bool): Whether running in production mode
    Returns:
        str: Path to the verified Ollama binary
    """
    try:
        ollama_path = get_ollama_path(isProd)
        if not os.path.exists(ollama_path):
            raise FileNotFoundError(f"Ollama binary not found at: {ollama_path}")

        # Check if the binary is executable
        if not os.access(ollama_path, os.X_OK):
            raise PermissionError(f"Ollama binary at {ollama_path} is not executable")

        return ollama_path
    except Exception as e:
        logging.error(f"Failed to locate Ollama binary: {e}")
        raise
