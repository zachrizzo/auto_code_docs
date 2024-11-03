#!/usr/bin/env python3
import os
import sys
import uvicorn
import argparse
import logging
import socket

def is_port_available(port: int) -> bool:
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return True
        except socket.error:
            return False

def find_available_port(start_port: int, max_attempts: int = 100) -> int:
    """Find the next available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    raise RuntimeError(f"No available ports found between {start_port} and {start_port + max_attempts}")

def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Parse arguments
    parser = argparse.ArgumentParser(description="Start the FastAPI server with dynamic ports.")
    parser.add_argument('--ollama-port', type=int, default=11434, help='Starting port for Ollama')
    parser.add_argument('--server-port', type=int, default=8001, help='Starting port for FastAPI server')
    args = parser.parse_args()
    logging.info(f'Initial arguments: {args}')

    try:
        # Find available ports
        ollama_port = find_available_port(args.ollama_port)
        if ollama_port != args.ollama_port:
            logging.warning(f"Default Ollama port {args.ollama_port} was taken, using port {ollama_port} instead")

        server_port = find_available_port(args.server_port)
        if server_port != args.server_port:
            logging.warning(f"Default server port {args.server_port} was taken, using port {server_port} instead")

        # Set environment variables
        os.environ['OLLAMA_PORT'] = str(ollama_port)
        os.environ['SERVER_PORT'] = str(server_port)

        # Get the appropriate Ollama binary path
        from app.ollama.ollama_path_fix import ensure_binary_exists
        binary_path = ensure_binary_exists()
        logging.info(f"Using Ollama binary at: {binary_path}")

        # Set environment variables
        os.environ['OLLAMA_PATH'] = binary_path

        # Set settings variables
        from app.config import settings
        settings.OLLAMA_PORT = ollama_port
        settings.SERVER_PORT = server_port
        settings.OLLAMA_BINARY_PATH = binary_path

        # Import app only after environment is setup
        from app.main import app

        # Start server
        logging.info(f"Starting server on port {server_port}")
        uvicorn.run(app, host="127.0.0.1", port=server_port)

    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        # sys.exit(1)

if __name__ == "__main__":
    main()
