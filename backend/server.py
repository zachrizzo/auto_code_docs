# main.py
import uvicorn
from app.main import app
import logging

SERVER_PORT = 8001  # Or whichever port you want

if __name__ == "__main__":
    try:
        uvicorn.run(app, host="127.0.0.1", port=SERVER_PORT)
    except Exception as e:
        logging.error(f"Failed to start FastAPI server: {e}")
