from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import uuid
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import os
from langchain_community.embeddings import OllamaEmbeddings


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

# Sample root endpoint
@app.get("/")
def read_root():
    return {"message": "Corrective-RAG FastAPI Server is running"}
