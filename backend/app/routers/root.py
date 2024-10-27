# app/routers/root.py

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root():
    """Root endpoint to verify server status."""
    return {"message": "Corrective-RAG FastAPI Server is running"}
