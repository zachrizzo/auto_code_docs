# app/routers/vector_search.py

from fastapi import APIRouter, HTTPException
from threading import Lock
import logging
import os
from typing import Optional
from app.models import (
    InitializeVectorStoreRequest,
    InitializeVectorStoreResponse,
    SearchCodeRequest,
    SearchCodeResponse
)
from app.vector_search import (
    vectorize_graph_data,
    save_vectorstore,
    load_vectorstore,
    search_graph_data
)
import json

from langchain.vectorstores import FAISS
from app.models import SearchResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Global variables with type hints
vectorstore: Optional[FAISS] = None  # Use FAISS type
vectorstore_lock = Lock()  # Lock for thread safety

@router.post("/initialize-vectorstore", response_model=InitializeVectorStoreResponse)
async def initialize_vectorstore(request: InitializeVectorStoreRequest):
    """
    Endpoint to initialize the vector store from analyzed graph data.
    Expects graph_data as part of the request.
    """
    global vectorstore
    with vectorstore_lock:
        try:
            logger.info("Initializing vector store from graph data.")

            # The graph_data is already parsed by Pydantic model
            # No need to parse JSON again unless it's explicitly a string
            graph_data = request.graph_data
            if isinstance(graph_data, str):
                try:
                    graph_data = json.loads(graph_data)
                except json.JSONDecodeError as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid JSON in graph_data: {str(e)}"
                    )

            # Validate graph_data structure
            if not graph_data:
                raise HTTPException(
                    status_code=400,
                    detail="Graph data cannot be empty"
                )

            vectorstore = vectorize_graph_data(graph_data)

            # Create directory if it doesn't exist
            os.makedirs("data", exist_ok=True)
            save_path = os.path.join("data", "vectorstore.faiss")

            # Save the vectorstore to disk
            save_vectorstore(vectorstore, save_path)
            logger.info("Vector store initialized and saved successfully")

            return InitializeVectorStoreResponse(message="Vector store initialized successfully.")

        except Exception as e:
            logger.error(f"Error initializing vector store: {str(e)}", exc_info=True)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

@router.post("/search-code", response_model=SearchCodeResponse)
async def search_code(request: SearchCodeRequest):
    """Endpoint to search code and related content similar to the query."""
    global vectorstore
    with vectorstore_lock:
        try:
            if vectorstore is None:
                save_path = os.path.join("data", "vectorstore.faiss")
                if os.path.exists(save_path):
                    logger.info("Loading vector store from disk")
                    try:
                        vectorstore = load_vectorstore(save_path)
                        logger.info("Vector store loaded successfully")
                    except Exception as load_error:
                        logger.error(f"Error loading vector store: {str(load_error)}")
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to load vector store: {str(load_error)}"
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Vector store is not initialized. Please call /initialize-vectorstore first."
                    )

            logger.info(f"Searching for query: {request.query}")
            search_results = search_graph_data(vectorstore, request.query, request.top_k)

            # Format results according to the SearchResult model
            formatted_results = [
                SearchResult(
                    content=result[0]["content"],
                    code_preview=result[0]["code_preview"],
                    metadata=result[0]["metadata"],
                    score=result[1]
                )
                for result in search_results
            ]

            return SearchCodeResponse(results=formatted_results)

        except Exception as e:
            logger.error(f"Error searching code: {str(e)}", exc_info=True)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Failed to search code: {str(e)}"
            )
