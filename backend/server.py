#!/usr/bin/env python3
import os
import sys
import uvicorn
import argparse
import logging
from app.ollama_path_fix import ensure_binary_exists

def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Parse arguments
    parser = argparse.ArgumentParser(description="Start the FastAPI server with dynamic ports.")
    parser.add_argument('--ollama-port', type=int, default=11434, help='Port for Ollama')
    parser.add_argument('--server-port', type=int, default=8001, help='Starting port for FastAPI server')
    parser.add_argument('--prod', action='store_true', help='Run in production mode')  # Changed to simple flag
    args = parser.parse_args()

    logging.info(f'Parsed arguments: {args}')
    logging.info(f'Server is in production mode: {args.prod}')

    try:
        # Get the appropriate Ollama binary path
        binary_path = ensure_binary_exists(isProd=args.prod)
        logging.info(f"Using Ollama binary at: {binary_path}")

        # Set environment variables
        os.environ['OLLAMA_PATH'] = binary_path
        os.environ['OLLAMA_PORT'] = str(args.ollama_port)

        # Import app only after environment is setup
        from app.main import app

        # Start server
        uvicorn.run(app, host="127.0.0.1", port=args.server_port)

    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
