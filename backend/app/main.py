# main.py
import os
import socket
import subprocess
import time
import logging
import psutil
import re
import json
import hashlib

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

# Define paths
# OLLAMA_BINARY_NAME = 'ollama' if sys.platform != 'win32' else 'ollama.exe'
# OLLAMA_BINARY_PATH = os.path.join(BASE_DIR, 'ollama', OLLAMA_BINARY_NAME)
# OLLAMA_DATA_DIR = os.path.join(BASE_DIR, 'ollama')
# OLLAMA_MODELS_DIR = os.path.join(OLLAMA_DATA_DIR, 'models')

OLLAMA_BINARY_PATH = "./ollama/ollama"
OLLAMA_DATA_DIR = "./ollama"
OLLAMA_MODELS_DIR = "./ollama/models"


# Ensure the models directory exists
os.makedirs(OLLAMA_MODELS_DIR, exist_ok=True)

# Set environment variables for Ollama
os.environ['OLLAMA_DATA'] = OLLAMA_DATA_DIR
os.environ['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR

# Define other constants
OLLAMA_PORT = 11434  # Default Ollama port
SERVER_PORT = 8001    # FastAPI server port

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
    """Check if the Ollama process is running."""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if proc.info['name'] and 'ollama' in proc.info['name']:
            return True
        if proc.info['cmdline'] and any('ollama' in cmd for cmd in proc.info['cmdline']):
            return True
    return False

def start_ollama():
    """Start the Ollama server as a subprocess."""
    logging.info(f"Attempting to start Ollama from: {OLLAMA_BINARY_PATH}")

    print("Starting Ollama...", OLLAMA_BINARY_PATH)
    global ollama_process
    if not is_ollama_running():
        try:
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR  # Ensure models directory is set

            if not os.path.exists(OLLAMA_BINARY_PATH):
                raise FileNotFoundError(f"Ollama binary not found at {OLLAMA_BINARY_PATH}")

            ollama_process = subprocess.Popen(
                [OLLAMA_BINARY_PATH, "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env
            )
            logging.info(f"Ollama started with PID {ollama_process.pid}")
            # Wait for Ollama to be ready
            timeout = 30  # seconds
            start_time = time.time()
            while time.time() - start_time < timeout:
                if is_port_in_use(OLLAMA_PORT):
                    logging.info("Ollama is up and running.")
                    return
                time.sleep(1)
            raise Exception("Ollama did not start within the expected time.")
        except Exception as e:
            logging.error(f"Failed to start Ollama: {e}")
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
    # Startup code
    start_ollama()
    yield
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

# Define the Ollama LLM for documentation and unit test generation
llm = ChatOllama(model=ollama_models[0], temperature=0)
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

ollama_emb = OllamaEmbeddings(model=ollama_models[0])

async def install_models_stream(request: ModelInstallRequest):
    """Stream the model installation process."""
    ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')

    for model_name in request.models:
        try:
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = OLLAMA_MODELS_DIR  # Ensure models directory is set

            # Check if the model exists
            result = subprocess.run([OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True, env=env)

            # Split the output into lines and check if the model name is in any of them
            model_exists = any(model_name in line.split() for line in result.stdout.splitlines())

            if not model_exists:
                yield f"data: Installing model {model_name}...\n\n"
                # Pull the model
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

@app.post("/install-models", response_class=StreamingResponse)
async def install_models(request: Request, install_request: ModelInstallRequest):
    """Endpoint to install Ollama models."""
    return StreamingResponse(install_models_stream(install_request), media_type="text/event-stream")

@app.post("/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(request: GenerateDocsRequest):
    """Endpoint to generate documentation for given function or class code."""
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
