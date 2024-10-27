# app/routers/get_embeddings.py

from fastapi import APIRouter, HTTPException
import logging
from app.models import GetEmbeddingsRequest, GetEmbeddingsResponse
from app.ollama.llm import ollama_emb, ollama_available

router = APIRouter()

@router.post("/get-embeddings", response_model=GetEmbeddingsResponse)
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
