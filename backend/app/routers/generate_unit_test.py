# app/routers/generate_unit_test.py

from fastapi import APIRouter, HTTPException
import logging
from app.models import GenerateTestsRequest, GenerateTestsResponse
from app.ollama.llm import test_chain, ollama_available

router = APIRouter()

@router.post("/generate-unit-test", response_model=GenerateTestsResponse)
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
