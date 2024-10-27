import os
import sys
import logging
import platform
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables for development mode
load_dotenv(dotenv_path='/Users/zachrizzo/programing/auto_code_docs_app/.env')

def get_ollama_path():
    """
    Get the Ollama binary path based on the environment (dev/prod) and platform.
    Args:
        isProd (bool): Whether running in production mode
    Returns:
        str: Path to the Ollama binary
    """
    # logging.info(f"Getting Ollama path for {'production' if isProd else 'development'} mode")


    # Production environment
    if platform.system() == 'Darwin':  # macOS
        # Get the actual path where the executable is being run from
        executable_path = os.path.dirname(os.path.abspath(sys.argv[0]))
        logging.debug(f"Executable is running from: {executable_path}")

        # Construct path to ollama binary relative to the executable location
        ollama_path = os.path.join(executable_path, "ollama", "ollama")
        logging.debug(f"Looking for ollama binary at: {ollama_path}")
    else:
        raise NotImplementedError(f"Platform {platform.system()} not supported yet in production mode")


    logging.info(f"Using Ollama binary at: {ollama_path}")
    return str(ollama_path)

def ensure_binary_exists():
    """
    Ensure the Ollama binary is available and return its path.
    Args:
        isProd (bool): Whether running in production mode
    Returns:
        str: Path to the verified Ollama binary
    """
    try:
        ollama_path = get_ollama_path()
        if not os.path.exists(ollama_path):
            raise FileNotFoundError(f"Ollama binary not found at: {ollama_path}")

        # Check if the binary is executable
        if not os.access(ollama_path, os.X_OK):
            try:
                os.chmod(ollama_path, 0o755)
            except Exception as e:
                raise PermissionError(f"Could not make Ollama binary at {ollama_path} executable: {e}")

        return ollama_path
    except Exception as e:
        logging.error(f"Failed to locate Ollama binary: {e}")
        raise
