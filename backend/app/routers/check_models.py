# app/routers/check_models.py

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import logging
import subprocess
import re
import os

from app.models import ModelCheckRequest, ModelCheckResponse, ModelInstallRequest
from app.ollama.llm import ollama_available
from app.config import settings

router = APIRouter()

async def install_models_stream(request: ModelInstallRequest):
    """Stream the model installation process."""
    ansi_escape = re.compile(r'\x1B[@-_][0-?]*[ -/]*[@-~]')

    for model_name in request.models:
        try:
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = settings.OLLAMA_MODELS_DIR  # Ensure models directory is set
            env['OLLAMA_PORT'] = str(settings.OLLAMA_PORT)     # Set Ollama port in environment

            # Check if the model exists without using --port
            result = subprocess.run([settings.OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True, env=env)

            # Split the output into lines and check if the model name is in any of them
            model_exists = any(model_name in line.split() for line in result.stdout.splitlines())

            if not model_exists:
                yield f"data: Installing model {model_name}...\n\n"
                # Pull the model without using --port
                process = subprocess.Popen(
                    [settings.OLLAMA_BINARY_PATH, "pull", model_name],
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
        env['OLLAMA_MODELS'] = settings.OLLAMA_MODELS_DIR  # Ensure models directory is set
        env['OLLAMA_PORT'] = str(settings.OLLAMA_PORT)     # Set Ollama port in environment

        # Get the list of installed models
        result = subprocess.run([settings.OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True, env=env)
        installed_models = [line.split()[0] for line in result.stdout.splitlines()]

        # Determine missing models
        for model in request.models:
            if model not in installed_models:
                missing_models.append(model)

        return ModelCheckResponse(missing_models=missing_models)
    except Exception as e:
        logging.error(f"Error checking models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-models", response_model=ModelCheckResponse)
async def check_models_endpoint(request: ModelCheckRequest):
    """Endpoint to check which models are missing."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    return await check_models(request)

@router.post("/install-models", response_class=StreamingResponse)
async def install_models(request: Request, install_request: ModelInstallRequest):
    """Endpoint to install Ollama models."""
    if not ollama_available:
        raise HTTPException(status_code=503, detail="Ollama is not available.")
    return StreamingResponse(install_models_stream(install_request), media_type="text/event-stream")
