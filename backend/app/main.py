# app/main.py

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import (
    generate_docs,
    generate_unit_test,
    get_embeddings,
    compare_documents,
    check_models,
    root,
)
from app.ollama.ollama_utils import start_ollama, terminate_ollama

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

# Include routers
app.include_router(generate_docs.router)
app.include_router(generate_unit_test.router)
app.include_router(get_embeddings.router)
app.include_router(compare_documents.router)
app.include_router(check_models.router)
app.include_router(root.router)
