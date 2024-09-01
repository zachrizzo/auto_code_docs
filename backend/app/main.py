from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import uuid
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from langchain_community.embeddings import OllamaEmbeddings
from app.database.firebase import  fetch_and_list_doc_types
import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError
import json
import hashlib

load_dotenv()

# Initialize the FastAPI app
app = FastAPI()

ollama_model = 'llama3:8b-instruct-q6_K'


# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Define the request and response models
class GenerateDocsRequest(BaseModel):
    function_code: str

class GenerateDocsResponse(BaseModel):
    documentation: str

# Define the request and response models
class GetEmbeddingsRequest(BaseModel):
    text: str

class GetEmbeddingsResponse(BaseModel):
    embeddings: List[float]

# Pydantic model for request body
class CollectionRequest(BaseModel):
    collection_name: str
    service_account: Dict

# Define the Ollama LLM and prompt for documentation generation
llm = ChatOllama(
    model=ollama_model,
    temperature=0,
)

doc_prompt = PromptTemplate(
    template="""You are an AI assistant tasked with generating very sort documentation in 5 sentences for the following functions or classes.

    {function_code}

    Documentation:
    """,
    input_variables=["function_code"],
)

doc_chain = doc_prompt | llm | StrOutputParser()

ollama_emb = OllamaEmbeddings(model=ollama_model)  # Replace with your desired model


# Define the endpoint to generate documentation
@app.post("/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(request: GenerateDocsRequest):
    try:
        # Use the LLM to generate documentation
        function_code = request.function_code
        print("Invoking doc_chain with function_code:", function_code)  # Debugging log

        # Invoke the chain
        response = doc_chain.invoke({"function_code": function_code})

        # Log the type and structure of the response
        print(f"Response type: {type(response)}")
        print(f"Response content: {response}")

        # Check if response is an AIMessage or similar and extract the content
        if hasattr(response, 'content'):
            documentation = response.content
        elif isinstance(response, str):
            documentation = response  # If it's already a string
        else:
            raise ValueError("The response does not contain valid content or is not a string.")

        print("Documentation generated:", documentation)  # Debugging log
        return GenerateDocsResponse(documentation=documentation)
    except Exception as e:
        print("Error occurred:", str(e))  # Debugging log
        raise HTTPException(status_code=500, detail=str(e))

#get embeddings
@app.post("/get-embeddings", response_model=GetEmbeddingsResponse)
async def get_embeddings(request: GetEmbeddingsRequest):
    try:
        # Generate embeddings using the Ollama model
        embeddings = ollama_emb.embed_query(request.text)

        # Return the embeddings in the response
        return GetEmbeddingsResponse(embeddings=embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compare-documents")
async def compare_documents(request: CollectionRequest):
    collection_name = request.collection_name
    service_account = request.service_account
    print(f"Comparing documents in collection '{collection_name}'")

    try:
        # Create a unique hash for the service account credentials
        service_account_hash = hashlib.sha256(json.dumps(service_account, sort_keys=True).encode()).hexdigest()

        # Check if an app with the same credentials is already initialized
        if service_account_hash not in firebase_admin._apps:
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred, name=service_account_hash)
        else:
            print("Firebase app already initialized with the same credentials.")

        # Use the appropriate Firestore client
        db = firestore.client(firebase_admin.get_app(service_account_hash))

        discrepancies = fetch_and_list_doc_types(db, collection_name)
        print("Discrepancies found:", discrepancies)

        if "error" in discrepancies:
            # If there was an error fetching documents, return it with the discrepancies found so far
            return {"error": discrepancies["error"], "discrepancies": discrepancies["document_types"]}

        return {"discrepancies": discrepancies}

    except FirebaseError as e:
        print(f"Firebase error: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize Firebase Admin SDK.")
    except Exception as e:
        print(f"Error fetching documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch and compare documents.")

# Sample root endpoint
@app.get("/")
def read_root():
    return {"message": "Corrective-RAG FastAPI Server is running"}
