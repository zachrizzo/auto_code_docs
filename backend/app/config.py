# app/config.py

import os
import sys
import logging
from dotenv import load_dotenv
from pydantic_settings import BaseSettings  # Updated import

class Settings(BaseSettings):
    OLLAMA_PORT: int = int(os.getenv('OLLAMA_PORT', '11434'))
    SERVER_PORT: int = int(os.getenv('SERVER_PORT', '8001'))
    OLLAMA_BINARY_PATH: str = os.getenv('OLLAMA_PATH', '')
    OLLAMA_DATA_DIR: str = ''
    OLLAMA_MODELS_DIR: str = ''
    OLLAMA_MODELS: list = ['llama3:8b']

    class Config:
        env_file = '.env'

settings = Settings()

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_base_dir():
    """Determine the base directory for the application."""
    if getattr(sys, 'frozen', False):
        # Running as a bundled executable
        return sys._MEIPASS
    else:
        # Running in development mode
        return os.path.dirname(os.path.abspath(__file__))

def get_resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    if getattr(sys, 'frozen', False):
        # If the application is run as a bundle
        base_path = sys._MEIPASS
    else:
        # If the application is run from a Python interpreter
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)

# Define base directory
BASE_DIR = get_base_dir()

# Update the data and models directories
OLLAMA_DATA_DIR = get_resource_path("ollama")
OLLAMA_MODELS_DIR = get_resource_path("ollama/models")

settings.OLLAMA_DATA_DIR = OLLAMA_DATA_DIR
settings.OLLAMA_MODELS_DIR = OLLAMA_MODELS_DIR

# Ensure the models directory exists
os.makedirs(OLLAMA_MODELS_DIR, exist_ok=True)

# Set environment variables for Ollama
os.environ['OLLAMA_DATA'] = OLLAMA_DATA_DIR
os.environ['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR
os.environ['OLLAMA_PORT'] = str(settings.OLLAMA_PORT)
