#!/usr/bin/env python3
import os
import sys
import uvicorn
from app.main import app
import logging

SERVER_PORT = 8001

if getattr(sys, 'frozen', False):
    # Running as compiled executable
    base_dir = sys._MEIPASS
else:
    # Running in development mode
    base_dir = os.path.dirname(os.path.abspath(__file__))

# Update paths
os.environ['OLLAMA_DATA'] = os.path.join(base_dir, 'app', 'ollama')
os.environ['OLLAMA_MODELS'] = os.path.join(base_dir, 'app', 'ollama', 'models')

if __name__ == "__main__":
    try:
        uvicorn.run(app, host="127.0.0.1", port=SERVER_PORT)
    except Exception as e:
        logging.error(f"Failed to start FastAPI server: {e}")
