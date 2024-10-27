# app/routers/generate_docs.py

from fastapi import APIRouter, HTTPException
import logging
from app.models import GenerateDocsRequest, GenerateDocsResponse
from app.ollama.llm import doc_chain, ollama_available

router = APIRouter()

@router.post("/generate-docs", response_model=GenerateDocsResponse)
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
