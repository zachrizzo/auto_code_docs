from fastapi import APIRouter
from .models import CRAGRequest, CRAGResponse, EvaluationRequest
from .services import predict_custom_agent_answer, evaluate_agent

router = APIRouter()

@router.post("/predict", response_model=CRAGResponse)
async def predict_answer(request: CRAGRequest):
    result = predict_custom_agent_answer({"input": request.question})
    return CRAGResponse(response=result["response"], steps=result["steps"])

@router.post("/evaluate")
async def evaluate_agent_route(request: EvaluationRequest):
    results = evaluate_agent(request.examples)
    return results
