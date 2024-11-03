from pydantic import BaseModel, field_validator
from typing import Dict, Any, List, Union
import json

# Request and response models for documentation generation
class GenerateDocsRequest(BaseModel):
    function_code: str

    class Config:
        arbitrary_types_allowed = True  # Allow arbitrary types to avoid validation errors

class GenerateDocsResponse(BaseModel):
    documentation: str

    class Config:
        arbitrary_types_allowed = True  # Allow arbitrary types to avoid validation errors

class GetEmbeddingsRequest(BaseModel):
    text: str

class GetEmbeddingsResponse(BaseModel):
    embeddings: List[float]

# Request model for collection operations
class CollectionRequest(BaseModel):
    collection_name: str
    service_account: Dict[str, Any]  # Specified Any for flexibility

# Request and response models for test generation
class GenerateTestsRequest(BaseModel):
    function_code: str

class GenerateTestsResponse(BaseModel):
    test_code: str

# Request and response models for model installation
class ModelInstallRequest(BaseModel):
    models: List[str]

class ModelInstallResponse(BaseModel):
    results: List[Dict[str, Any]]

# Request and response models for model checks
class ModelCheckRequest(BaseModel):
    models: List[str]

class ModelCheckResponse(BaseModel):
    missing_models: List[str]

# Response model for code search
class SearchCodeResponse(BaseModel):
    results: List[Dict[str, Any]]

# Request model for initializing a vector store
class InitializeVectorStoreRequest(BaseModel):
    graph_data: Union[Dict[str, Any], str]

    @field_validator('graph_data')
    def validate_graph_data(cls, v):
        if isinstance(v, str):
            try:
                # Attempt to parse if it's a string
                parsed_data = json.loads(v)
                return parsed_data
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON string: {str(e)}")
        elif isinstance(v, dict):
            # If it's already a dict, validate it has the expected structure
            if not v.get('nodes') or not isinstance(v.get('nodes'), list):
                raise ValueError("Graph data must contain a 'nodes' array")
            return v
        raise ValueError("graph_data must be either a valid JSON string or dictionary")

class InitializeVectorStoreResponse(BaseModel):
    message: str

# Request and response models for code search
class SearchCodeRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    content: str
    code_preview: str
    metadata: Dict[str, Any]
    score: float

class SearchCodeResponse(BaseModel):
    results: List[SearchResult]


class Settings(BaseModel):
    # Define your expected fields here, for example:
    database_url: str
    api_key: str
    debug_mode: bool

    class Config:
        extra = "allow"  # Permit extra fields
