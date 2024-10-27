import os
import sys
import logging
import subprocess
import time
import socket
import psutil

from app.config import settings

OLLAMA_PORT = settings.OLLAMA_PORT
OLLAMA_MODELS_DIR = settings.OLLAMA_MODELS_DIR
OLLAMA_BINARY_PATH = settings.OLLAMA_BINARY_PATH

# Initialize global variable for Ollama subprocess
ollama_process = None

def is_port_in_use(port):
    """Check if a port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except socket.error:
            return True

def is_ollama_running():
    """Check if the Ollama process is running and listening on the specified port."""
    return is_port_in_use(OLLAMA_PORT)

def start_ollama():
    """Start the Ollama server as a subprocess."""
    binary_path = OLLAMA_BINARY_PATH
    if not binary_path or not os.path.exists(binary_path):
        raise FileNotFoundError(f"Ollama binary not found at {binary_path}. Please ensure Ollama is installed and accessible.")

    logging.info(f"Attempting to start Ollama from path: {binary_path}")

    global ollama_process
    if not is_ollama_running():
        try:
            # Set up environment variables for Ollama
            env = os.environ.copy()
            env['OLLAMA_HOST'] = f"127.0.0.1:{OLLAMA_PORT}"
            env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR

            # Start Ollama with just the 'serve' command
            ollama_process = subprocess.Popen(
                [binary_path, "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env
            )
            logging.info(f"Ollama started with PID {ollama_process.pid}")

            # Wait for Ollama to be ready
            timeout = 20  # seconds
            start_time = time.time()
            while time.time() - start_time < timeout:
                if is_port_in_use(OLLAMA_PORT):
                    logging.info("Ollama is up and running.")
                    return
                time.sleep(0.5)

            # If we reach here, Ollama didn't start properly
            stdout, stderr = ollama_process.communicate(timeout=5)
            logging.error(f"Ollama stdout: {stdout.decode()}")
            logging.error(f"Ollama stderr: {stderr.decode()}")
            raise Exception("Ollama did not start within the expected time.")
        except Exception as e:
            logging.error(f"Failed to start Ollama: {e}")
            if ollama_process:
                try:
                    stdout, stderr = ollama_process.communicate(timeout=5)
                    logging.error(f"Ollama stdout: {stdout.decode()}")
                    logging.error(f"Ollama stderr: {stderr.decode()}")
                except subprocess.TimeoutExpired:
                    logging.error("Timeout while capturing Ollama output.")
            raise
    else:
        logging.info("Ollama is already running.")

def terminate_ollama():
    """Terminate the Ollama subprocess."""
    global ollama_process
    if ollama_process and ollama_process.poll() is None:
        try:
            ollama_process.terminate()
            ollama_process.wait(timeout=10)
            logging.info("Ollama terminated gracefully.")
        except subprocess.TimeoutExpired:
            logging.warning("Ollama did not terminate in time. Killing it.")
            ollama_process.kill()
            ollama_process.wait()
            logging.info("Ollama killed.")
        except Exception as e:
            logging.error(f"Error terminating Ollama: {e}")
    else:
        logging.info("No Ollama process to terminate.")
