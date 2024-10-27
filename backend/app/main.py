import os
import socket
import subprocess
import time
import logging
import psutil
import re
import json
import hashlib
import argparse
import shutil

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, List
from dotenv import load_dotenv
from contextlib import asynccontextmanager

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError

from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.embeddings import OllamaEmbeddings

import sys

from app.database.firebase import fetch_and_list_doc_types

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

# Define base directory
BASE_DIR = get_base_dir()

# Set the default Ollama port (Assuming 11434 is the default. Change if different)
DEFAULT_OLLAMA_PORT = 11434

def get_resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    if getattr(sys, 'frozen', False):
        # If the application is run as a bundle
        base_path = sys._MEIPASS
    else:
        # If the application is run from a Python interpreter
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)

# Update the paths using the new function
OLLAMA_BINARY_PATH =  shutil.which("ollama")
OLLAMA_DATA_DIR = get_resource_path("ollama")
OLLAMA_MODELS_DIR = get_resource_path("ollama/models")

# Ensure the models directory exists
os.makedirs(OLLAMA_MODELS_DIR, exist_ok=True)

# Set environment variables for Ollama
os.environ['OLLAMA_DATA'] = OLLAMA_DATA_DIR
os.environ['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR

# Parse command-line arguments for dynamic ports
parser = argparse.ArgumentParser()
parser.add_argument('--ollama-port', type=int, default=11434, help='Port for Ollama')
parser.add_argument('--server-port', type=int, default=8001, help='Port for FastAPI server')
args = parser.parse_args()

OLLAMA_PORT = args.ollama_port  # Use the port passed as an argument
SERVER_PORT = args.server_port  # FastAPI server port

# Set environment variable for Ollama port
os.environ['OLLAMA_PORT'] = str(OLLAMA_PORT)

# List of models to manage
ollama_models = ['llama3:8b']

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
    """Check if the Ollama process is running on the specified port."""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if proc.info['name'] and 'ollama' in proc.info['name']:
            if f'--port={OLLAMA_PORT}' in proc.info['cmdline']:
                return True
        if proc.info['cmdline'] and any('ollama' in cmd for cmd in proc.info['cmdline']):
            if f'--port={OLLAMA_PORT}' in proc.info['cmdline']:
                return True
    return False

def start_ollama():
    """Start the Ollama server as a subprocess."""
    # Use shutil.which to find Ollama in the system PATH
    binary_path = OLLAMA_BINARY_PATH
    if not binary_path:
        raise FileNotFoundError("Ollama binary not found in system PATH. Please ensure Ollama is installed and accessible.")

    logging.info(f"Attempting to start Ollama from system path: {binary_path}")

    global ollama_process
    if not is_ollama_running():
        try:
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR
            env['OLLAMA_PORT'] = str(OLLAMA_PORT)

            ollama_process = subprocess.Popen(
                [binary_path, "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env
            )
            logging.info(f"Ollama started with PID {ollama_process.pid}")

            # Wait for Ollama to be ready
            timeout = 20
            start_time = time.time()
            while time.time() - start_time < timeout:
                if is_port_in_use(OLLAMA_PORT):
                    logging.info("Ollama is up and running.")
                    return
                time.sleep(0.5)
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    try:
        # Startup code
        start_ollama()
        yield
    except Exception as e:
        logging.error(f"Lifespan startup error: {e}")
        raise
    finally:
        # Shutdown code
        terminate_ollama()

# Initialize the FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Define request and response models
class GenerateDocsRequest(BaseModel):
    function_code: str

class GenerateDocsResponse(BaseModel):
    documentation: str

class GetEmbeddingsRequest(BaseModel):
    text: str

class GetEmbeddingsResponse(BaseModel):
    embeddings: List[float]

class CollectionRequest(BaseModel):
    collection_name: str
    service_account: Dict

class GenerateTestsRequest(BaseModel):
    function_code: str

class GenerateTestsResponse(BaseModel):
    test_code: str

class ModelInstallRequest(BaseModel):
    models: List[str]

class ModelInstallResponse(BaseModel):
    results: List[dict]

class ModelCheckRequest(BaseModel):
    models: List[str]

class ModelCheckResponse(BaseModel):
    missing_models: List[str]

# Define the Ollama LLM for documentation and unit test generation
ollama_available = True
try:
    llm = ChatOllama(model=ollama_models[0], temperature=0, base_url=f"http://127.0.0.1:{OLLAMA_PORT}")
    doc_prompt = PromptTemplate(
        template="""You are an AI assistant tasked with generating documentation in 5 sentences for the following functions or classes.
        {function_code}
        Documentation:
        """,
        input_variables=["function_code"]
    )

    test_prompt = PromptTemplate(
        template="""You are an AI assistant tasked with generating unit tests for the following function or class in the same programming language.
        {function_code}
        Unit Test:
        """,
        input_variables=["function_code"]
    )

    doc_chain = doc_prompt | llm | StrOutputParser()
    test_chain = test_prompt | llm | StrOutputParser()

    ollama_emb = OllamaEmbeddings(model=ollama_models[0], base_url=f"http://127.0.0.1:{OLLAMA_PORT}")
except Exception as e:
    logging.error(f"Ollama is not available: {e}")
    ollama_available = False

async def install_models_stream(request: ModelInstallRequest):
    """Stream the model installation process."""
    ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')

    for model_name in request.models:
        try:
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR  # Ensure models directory is set
            env['OLLAMA_PORT'] = str(OLLAMA_PORT)     # Set Ollama port in environment

            # Check if the model exists without using --port
            result = subprocess.run([OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True, env=env)

            # Split the output into lines and check if the model name is in any of them
            model_exists = any(model_name in line.split() for line in result.stdout.splitlines())

            if not model_exists:
                yield f"data: Installing model {model_name}...\n\n"
                # Pull the model without using --port
                process = subprocess.Popen(
                    [OLLAMA_BINARY_PATH, "pull", model_name],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    env=env
                )
                # Stream the output
                for line in process.stdout:
                    # Strip ANSI escape sequences
                    clean_line = ansi_escape.sub('', line).strip()
                    if clean_line:
                        # Only yield meaningful output
                        yield f"data: {clean_line}\n\n"
                process.wait()
                if process.returncode == 0:
                    yield f"data: Model {model_name} installed successfully.\n\n"
                else:
                    yield f"data: Failed to install model {model_name}.\n\n"
            else:
                yield f"data: Model {model_name} already exists.\n\n"
        except Exception as e:
            error_message = f"An error occurred while installing {model_name}: {str(e)}"
            yield f"data: {error_message}\n\n"
    yield "data: Installation process completed.\n\n"

async def check_models(request: ModelCheckRequest):
    """Check which models are missing from the system."""
    missing_models = []
    try:
        env = os.environ.copy()
        env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR  # Ensure models directory is set
        env['OLLAMA_PORT'] = str(OLLAMA_PORT)     # Set Ollama port in environment

        # Get the list of installed models
        result = subprocess.run([OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True, env=env)
        installed_models = [line.split()[0] for line in result.stdout.splitlines()]

        # Determine missing models
        for model in request.models:
            if model not in installed_models:
                missing_models.append(model)

        return ModelCheckResponse(missing_models=missing_models)
    except Exception as e:
        logging.error(f"Error checking models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/check-models", response_model=ModelCheckResponse)
async def check_models_endpoint(request: ModelCheckRequest):
    """Endpoint to check which models are missing."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    return await check_models(request)

@app.post("/install-models", response_class=StreamingResponse)
async def install_models(request: Request, install_request: ModelInstallRequest):
    """Endpoint to install Ollama models."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    return StreamingResponse(install_models_stream(install_request), media_type="text/event-stream")

@app.post("/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(request: GenerateDocsRequest):
    """Endpoint to generate documentation for given function or class code."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    try:
        function_code = request.function_code
        response = doc_chain.invoke({"function_code": function_code})
        if hasattr(response, 'content'):
            documentation = response.content
        elif isinstance(response, str):
            documentation = response
        else:
            raise ValueError("Invalid response format")
        return GenerateDocsResponse(documentation=documentation)
    except Exception as e:
        logging.error(f"Error generating documentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-unit-test", response_model=GenerateTestsResponse)
async def generate_tests(request: GenerateTestsRequest):
    """Endpoint to generate unit tests for given function or class code."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    try:
        function_code = request.function_code
        response = test_chain.invoke({"function_code": function_code})
        if hasattr(response, 'content'):
            test_code = response.content
        elif isinstance(response, str):
            test_code = response
        else:
            raise ValueError("Invalid response format")
        return GenerateTestsResponse(test_code=test_code)
    except Exception as e:
        logging.error(f"Error generating unit tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-embeddings", response_model=GetEmbeddingsResponse)
async def get_embeddings(request: GetEmbeddingsRequest):
    """Endpoint to get embeddings for the provided text."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    try:
        embeddings = ollama_emb.embed_query(request.text)
        return GetEmbeddingsResponse(embeddings=embeddings)
    except Exception as e:
        logging.error(f"Error getting embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compare-documents")
async def compare_documents(request: CollectionRequest):
    """Endpoint to compare documents in a Firebase collection."""
    collection_name = request.collection_name
    service_account = request.service_account

    logging.info(f"Comparing documents in collection: {collection_name}")

    try:
        service_account_hash = hashlib.sha256(json.dumps(service_account, sort_keys=True).encode()).hexdigest()
        if service_account_hash not in firebase_admin._apps:
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred, name=service_account_hash)

        logging.info('Initialized Firebase Admin SDK')

        db = firestore.client(firebase_admin.get_app(service_account_hash))
        discrepancies = fetch_and_list_doc_types(db, collection_name)
        if "error" in discrepancies:
            return {"error": discrepancies["error"], "discrepancies": discrepancies["document_types"]}

        return {"discrepancies": discrepancies}
    except FirebaseError as e:
        logging.error(f"FirebaseError: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize Firebase Admin SDK.")
    except Exception as e:
        logging.error(f"Exception: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch and compare documents.")

@app.get("/")
def read_root():
    """Root endpoint to verify server status."""
    return {"message": "Corrective-RAG FastAPI Server is running"}
