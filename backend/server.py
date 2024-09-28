import uvicorn
import subprocess
import os
import socket
import psutil
import time
import sys
import logging
from atexit import register

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Adjust the binary path for Ollama binary
OLLAMA_BINARY_PATH = "./ollama/ollama"  # Ensure this is correct
OLLAMA_PORT = 11434  # Default Ollama port
SERVER_PORT = 8001    # FastAPI server port

def is_port_in_use(port):
    """
    Checks if a port is in use.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def terminate_process_on_port(port):
    """
    Terminates all processes using the specified port.
    """
    terminated = False
    for proc in psutil.process_iter(attrs=['pid', 'name']):
        try:
            # Use net_connections instead of connections
            for conn in proc.net_connections(kind='inet'):
                if conn.laddr.port == port:
                    logging.info(f"Terminating process {proc.name()} (PID {proc.pid}) using port {port}.")
                    proc.terminate()
                    try:
                        proc.wait(timeout=5)
                        logging.info(f"Process {proc.pid} terminated successfully.")
                        terminated = True
                    except psutil.TimeoutExpired:
                        logging.warning(f"Process {proc.pid} did not terminate in time. Killing it.")
                        proc.kill()
                        terminated = True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
            logging.error(f"Error accessing process {proc.pid if 'proc' in locals() else 'unknown'}: {e}")
    if not terminated:
        logging.info(f"No process found using port {port}.")
    return terminated

def wait_for_port_release(port, timeout=5):
    """
    Waits until the specified port is free or until timeout.
    """
    start_time = time.time()
    while time.time() - start_time < timeout:
        if not is_port_in_use(port):
            return True
        time.sleep(0.5)
    return False

def start_ollama():
    """
    Starts Ollama in the background.
    """
    try:
        subprocess.Popen([OLLAMA_BINARY_PATH, "serve"])
        logging.info(f"Ollama started in the background on port {OLLAMA_PORT}.")
    except Exception as e:
        logging.error(f"An error occurred while starting Ollama: {e}")
        sys.exit(1)

def start_fastapi():
    """
    Starts the FastAPI server.
    """
    try:
        uvicorn.run("app.main:app", host="127.0.0.1", port=SERVER_PORT, reload=True)
    except Exception as e:
        logging.error(f"An error occurred while starting FastAPI: {e}")
        sys.exit(1)

def graceful_shutdown():
    """
    Gracefully shuts down Ollama and FastAPI by terminating their processes.
    """
    logging.info("Shutting down services...")
    if is_port_in_use(OLLAMA_PORT):
        terminate_process_on_port(OLLAMA_PORT)
    if is_port_in_use(SERVER_PORT):
        terminate_process_on_port(SERVER_PORT)
    logging.info("Shutdown complete.")

# Register the graceful shutdown function to be called on exit
register(graceful_shutdown)

if __name__ == "__main__":
    # Terminate Ollama if it's already running
    if is_port_in_use(OLLAMA_PORT):
        terminate_process_on_port(OLLAMA_PORT)
        if not wait_for_port_release(OLLAMA_PORT):
            logging.error(f"Port {OLLAMA_PORT} is still in use after termination.")
            sys.exit(1)

    # Start Ollama
    start_ollama()

    # Give Ollama some time to start
    time.sleep(2)

    # Terminate the FastAPI server if it's already running
    if is_port_in_use(SERVER_PORT):
        terminate_process_on_port(SERVER_PORT)
        if not wait_for_port_release(SERVER_PORT):
            logging.error(f"Port {SERVER_PORT} is still in use after termination.")
            sys.exit(1)

    # Start the FastAPI server
    start_fastapi()
