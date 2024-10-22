# app/backend/run_server.py

#!/usr/bin/env python3
import os
import sys
import uvicorn
import argparse
import logging

from app.main import app

def main():
    parser = argparse.ArgumentParser(description="Start the FastAPI server with dynamic ports.")
    parser.add_argument('--ollama-port', type=int, default=11434, help='Port for Ollama')
    parser.add_argument('--server-port', type=int, default=8001, help='Port for FastAPI server')
    args = parser.parse_args()

    SERVER_PORT = args.server_port

    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        base_dir = sys._MEIPASS
    else:
        # Running in development mode
        base_dir = os.path.dirname(os.path.abspath(__file__))

    # Update paths
    os.environ['OLLAMA_DATA'] = os.path.join(base_dir, 'ollama')
    os.environ['OLLAMA_MODELS'] = os.path.join(base_dir, 'ollama', 'models')
    os.environ['OLLAMA_PORT'] = str(args.ollama_port)

    try:
        uvicorn.run(app, host="127.0.0.1", port=SERVER_PORT)
    except Exception as e:
        logging.error(f"Failed to start FastAPI server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
