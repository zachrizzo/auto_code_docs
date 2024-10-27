# app/models.py

from pydantic import BaseModel
from typing import List, Dict

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

class ModelCheckRequest(BaseModel):
    models: List[str]

class ModelCheckResponse(BaseModel):
    missing_models: List[str]
