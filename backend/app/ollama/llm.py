# app/ollama/llm.py

import logging
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.embeddings import OllamaEmbeddings

from app.config import settings

OLLAMA_PORT = settings.OLLAMA_PORT
OLLAMA_MODELS = settings.OLLAMA_MODELS

# Define the Ollama LLM for documentation and unit test generation
ollama_available = True
try:
    llm = ChatOllama(model=OLLAMA_MODELS[0], temperature=0, base_url=f"http://127.0.0.1:{OLLAMA_PORT}")
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

    ollama_emb = OllamaEmbeddings(model=OLLAMA_MODELS[0], base_url=f"http://127.0.0.1:{OLLAMA_PORT}")
except Exception as e:
    logging.error(f"Ollama is not available: {e}")
    ollama_available = False
