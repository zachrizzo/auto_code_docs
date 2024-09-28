from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import uuid
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from langchain_community.embeddings import OllamaEmbeddings
from app.database.firebase import fetch_and_list_doc_types
import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError
import json
import hashlib
from fastapi.responses import StreamingResponse
import subprocess

load_dotenv()

# Initialize the FastAPI app
app = FastAPI()

# Model for Ollama
ollama_models = ['llama3:8b']
OLLAMA_BINARY_PATH = "./ollama/ollama"

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Define request and response models
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

# Define the Ollama LLM for documentation and unit test generation
llm = ChatOllama(model=ollama_models[0], temperature=0)
doc_prompt = PromptTemplate(
    template="""You are an AI assistant tasked with generating documentation in 5 sentences for the following functions or classes.
    {function_code}
    Documentation:
    """,
    input_variables=["function_code"]
)

test_prompt = PromptTemplate(
    template="""You are an AI assistant tasked with generating unit tests for the following function or class in the same programming language.
    {function_code}
    Unit Test:
    """,
    input_variables=["function_code"]
)

doc_chain = doc_prompt | llm | StrOutputParser()
test_chain = test_prompt | llm | StrOutputParser()

ollama_emb = OllamaEmbeddings(model=ollama_models[0])

async def install_models_stream(request: ModelInstallRequest):
    results = []
    for model_name in ollama_models:
        try:
            # Check if the model exists
            result = subprocess.run([OLLAMA_BINARY_PATH, "list"], capture_output=True, text=True)
            if model_name not in result.stdout:
                yield f"data: Installing model {model_name}...\n\n"
                # Pull the model
                subprocess.run([OLLAMA_BINARY_PATH, "pull", model_name], check=True)
                yield f"data: Model {model_name} installed successfully.\n\n"
                results.append({"model": model_name, "status": "installed", "message": "Model installed successfully."})
            else:
                yield f"data: Model {model_name} already exists.\n\n"
                results.append({"model": model_name, "status": "existing", "message": "Model already installed."})
        except subprocess.CalledProcessError as e:
            error_message = f"An error occurred while installing {model_name}: {str(e)}"
            yield f"data: {error_message}\n\n"
            results.append({"model": model_name, "status": "error", "message": error_message})

    # Optionally, send a completion message
    yield "data: Installation process completed.\n\n"

@app.post("/install-models", response_class=StreamingResponse)
async def install_models(request: Request, install_request: ModelInstallRequest):
    return StreamingResponse(install_models_stream(install_request), media_type="text/event-stream")

# Define the endpoint to generate documentation
@app.post("/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(request: GenerateDocsRequest):
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
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

# Define the endpoint to generate unit tests
@app.post("/generate-unit-test", response_model=GenerateTestsResponse)
async def generate_tests(request: GenerateTestsRequest):
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
        raise HTTPException(status_code=500, detail=str(e))

# Get embeddings endpoint
@app.post("/get-embeddings", response_model=GetEmbeddingsResponse)
async def get_embeddings(request: GetEmbeddingsRequest):
    try:
        embeddings = ollama_emb.embed_query(request.text)
        return GetEmbeddingsResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Compare documents endpoint
@app.post("/compare-documents")
async def compare_documents(request: CollectionRequest):
    collection_name = request.collection_name
    service_account = request.service_account

    try:
        service_account_hash = hashlib.sha256(json.dumps(service_account, sort_keys=True).encode()).hexdigest()
        if service_account_hash not in firebase_admin._apps:
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred, name=service_account_hash)

        db = firestore.client(firebase_admin.get_app(service_account_hash))
        discrepancies = fetch_and_list_doc_types(db, collection_name)
        if "error" in discrepancies:
            return {"error": discrepancies["error"], "discrepancies": discrepancies["document_types"]}

        return {"discrepancies": discrepancies}
    except FirebaseError as e:
        raise HTTPException(status_code=500, detail="Failed to initialize Firebase Admin SDK.")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch and compare documents.")

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Corrective-RAG FastAPI Server is running"}
