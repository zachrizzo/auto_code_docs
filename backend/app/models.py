from pydantic import BaseModel
from typing import List, Dict

class CRAGRequest(BaseModel):
    question: str

class CRAGResponse(BaseModel):
    response: str
    steps: List[str]

class EvaluationExample(BaseModel):
    input: str
    output: str

class EvaluationRequest(BaseModel):
    examples: List[EvaluationExample]
