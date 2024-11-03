# app/vector_search.py

import os
import glob
import ast
import logging
from typing import List, Tuple
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import FAISS
from typing import Dict
from langchain.schema import Document
from typing import List, Tuple
import json


from app.config import settings

class CodeExtractor(ast.NodeVisitor):
    """Extracts functions and classes from Python code."""

    def __init__(self):
        self.code_snippets = []

    def visit_FunctionDef(self, node):
        code = ast.get_source_segment(self.source_code, node)
        self.code_snippets.append(code)
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        code = ast.get_source_segment(self.source_code, node)
        self.code_snippets.append(code)
        self.generic_visit(node)

def extract_code_snippets(code_base_path: str) -> List[str]:
    """Extract functions and classes from codebase."""
    code_snippets = []
    for filepath in glob.glob(os.path.join(code_base_path, '**/*.py'), recursive=True):
        logging.info(f"Processing file: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as file:
            source_code = file.read()
            try:
                tree = ast.parse(source_code)
                extractor = CodeExtractor()
                extractor.source_code = source_code
                extractor.visit(tree)
                logging.info(f"Extracted {len(extractor.code_snippets)} snippets from {filepath}")
                code_snippets.extend(extractor.code_snippets)
            except Exception as e:
                logging.error(f"Error parsing {filepath}: {e}")
    logging.info(f"Total code snippets extracted: {len(code_snippets)}")
    return code_snippets

def vectorize_code_snippets(code_snippets: List[str]) -> FAISS:
    """Vectorize code snippets and return FAISS index."""
    logging.info("Initializing embeddings model")
    # Initialize embeddings model
    embeddings = OllamaEmbeddings(
        model=settings.OLLAMA_MODELS[0],
        base_url=f"http://127.0.0.1:{settings.OLLAMA_PORT}"
    )

    logging.info(f"Number of code snippets to embed: {len(code_snippets)}")
    # Create Documents
    documents = [Document(page_content=snippet) for snippet in code_snippets]

    # Verify if documents are created
    logging.info(f"Number of documents created: {len(documents)}")

    # Create FAISS index
    try:
        vectorstore = FAISS.from_documents(documents, embeddings)
        logging.info("FAISS vector store created successfully")
    except Exception as e:
        logging.error(f"Error creating FAISS vector store: {e}")
        raise e

    return vectorstore

def save_vectorstore(vectorstore: FAISS, filepath: str):
    """Save FAISS vectorstore to disk."""
    if vectorstore is None:
        raise ValueError("The vectorstore is None and cannot be saved.")
    vectorstore.save_local(filepath)

def load_vectorstore(filepath: str) -> FAISS:
    """Load FAISS vectorstore from disk."""
    embeddings = OllamaEmbeddings(
        model=settings.OLLAMA_MODELS[0],
        base_url=f"http://127.0.0.1:{settings.OLLAMA_PORT}"
    )
    return FAISS.load_local(
        folder_path=filepath,
        embeddings=embeddings,
        allow_dangerous_deserialization=True  # Only enable if you trust the source of the vectorstore
    )

def search_code_snippets(vectorstore: FAISS, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
    """Search for code snippets similar to the query."""
    results = vectorstore.similarity_search_with_score(query, k=top_k)
    return [(result[0].page_content, result[1]) for result in results]

def vectorize_graph_data(graph_data: Dict) -> FAISS:
    """
    Vectorize graph data and return FAISS index.
    Processes code content, relationships, and metadata from the graph structure.
    Each file in the graph data contains its own declarations and relationships.
    """
    logging.info("Vectorizing graph data with full code analysis")
    documents = []

    # Ensure graph_data is properly parsed if it's a string
    if isinstance(graph_data, str):
        try:
            graph_data = json.loads(graph_data)
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse graph data: {e}")
            raise ValueError(f"Invalid JSON data: {e}")

    # Iterate through each file object in the graph_data
    file_objects = graph_data.items()

    logging.info(f"Processing {len(file_objects)} file objects")
    for file_path, file_obj in file_objects:

        # Get declarations and relationships for this file
        all_declarations = file_obj.get("allDeclarations", {})
        direct_relationships = file_obj.get("directRelationships", {})

        logging.info(f"Processing file: {file_path} with {len(all_declarations)} declarations")

        # Process each declaration in this file
        for declaration_id, declaration in all_declarations.items():
            node_content = []

            # Add file path first for better context
            if file_path:
                node_content.append(f"File: {file_path}")

            # Add basic information
            if declaration.get("name"):
                node_content.append(f"Name: {declaration['name']}")

            if declaration.get("type"):
                node_content.append(f"Type: {declaration['type']}")

            # Add code content
            if declaration.get("code"):
                node_content.append(f"Code:\n{declaration['code']}")

            # Add relationships from this file's direct relationships
            related_functions = direct_relationships.get(declaration_id, [])
            if related_functions:
                relationships = []
                for related_id in related_functions:
                    related_name = all_declarations.get(related_id, {}).get("name", related_id)
                    relationships.append(related_name)
                if relationships:
                    node_content.append(f"Related functions: {', '.join(relationships)}")

            # Create the combined content
            combined_content = "\n".join(node_content)

            if combined_content.strip():
                documents.append(Document(
                    page_content=combined_content,
                    metadata={
                        "id": declaration_id,
                        "name": declaration.get("name", ""),
                        "type": declaration.get("type", ""),
                        "file": file_path,
                        "node_type": declaration.get("nodeType", ""),
                        "file_path": file_path
                    }
                ))

    if not documents:
        logging.error("No valid documents created from declarations")
        raise ValueError(f"No valid content available to vectorize")

    logging.info(f"Created {len(documents)} documents for vectorization across {len(file_objects)} files")

    # Initialize embeddings model
    embeddings = OllamaEmbeddings(
        model=settings.OLLAMA_MODELS[0],
        base_url=f"http://127.0.0.1:{settings.OLLAMA_PORT}"
    )

    # Create FAISS index
    try:
        vectorstore = FAISS.from_documents(documents, embeddings)
        logging.info(f"FAISS vector store created successfully with {len(documents)} documents")
    except Exception as e:
        logging.error(f"Error creating FAISS vector store: {e}")
        raise e

    return vectorstore


def vectorize_graph_data(graph_data: Dict) -> FAISS:
    """
    Vectorize graph data and return FAISS index.
    Processes code content, relationships, and metadata from the graph structure.
    Each file in the graph data contains its own declarations and relationships.
    """
    logging.info("Vectorizing graph data with full code analysis")
    documents = []

    # Ensure graph_data is properly parsed if it's a string
    if isinstance(graph_data, str):
        try:
            graph_data = json.loads(graph_data)
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse graph data: {e}")
            raise ValueError(f"Invalid JSON data: {e}")

    # Iterate through each file object in the graph_data
    file_objects = graph_data.items()

    logging.info(f"Processing {len(file_objects)} file objects")
    for file_path, file_obj in file_objects:

        # Get declarations and relationships for this file
        all_declarations = file_obj.get("allDeclarations", {})
        direct_relationships = file_obj.get("directRelationships", {})

        logging.info(f"Processing file: {file_path} with {len(all_declarations)} declarations")

        # Process each declaration in this file
        for declaration_id, declaration in all_declarations.items():
            node_content = []

            # Add file path first for better context
            if file_path:
                node_content.append(f"File: {file_path}")

            # Add basic information
            if declaration.get("name"):
                node_content.append(f"Name: {declaration['name']}")

            if declaration.get("type"):
                node_content.append(f"Type: {declaration['type']}")

            # Add code content
            if declaration.get("code"):
                node_content.append(f"Code:\n{declaration['code']}")

            # Add relationships from this file's direct relationships
            related_functions = direct_relationships.get(declaration_id, [])
            if related_functions:
                relationships = []
                for related_id in related_functions:
                    related_name = all_declarations.get(related_id, {}).get("name", related_id)
                    relationships.append(related_name)
                if relationships:
                    node_content.append(f"Related functions: {', '.join(relationships)}")

            # Create the combined content
            combined_content = "\n".join(node_content)

            if combined_content.strip():
                documents.append(Document(
                    page_content=combined_content,
                    metadata={
                        "id": declaration_id,
                        "name": declaration.get("name", ""),
                        "type": declaration.get("type", ""),
                        "file": file_path,
                        "node_type": declaration.get("nodeType", ""),
                        "file_path": file_path
                    }
                ))

    if not documents:
        logging.error("No valid documents created from declarations")
        raise ValueError(f"No valid content available to vectorize")

    logging.info(f"Created {len(documents)} documents for vectorization across {len(file_objects)} files")

    # Initialize embeddings model
    embeddings = OllamaEmbeddings(
        model=settings.OLLAMA_MODELS[0],
        base_url=f"http://127.0.0.1:{settings.OLLAMA_PORT}"
    )

    # Create FAISS index
    try:
        vectorstore = FAISS.from_documents(documents, embeddings)
        logging.info(f"FAISS vector store created successfully with {len(documents)} documents")
    except Exception as e:
        logging.error(f"Error creating FAISS vector store: {e}")
        raise e

    return vectorstore

def search_graph_data(vectorstore: FAISS, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
    """
    Search for code and related content similar to the query.
    Returns both the content and similarity scores.
    """
    logging.info(f"Performing similarity search with query: {query}")
    try:
        results = vectorstore.similarity_search_with_score(query, k=top_k)

        # Format results to include relevant metadata
        formatted_results = []
        for doc, score in results:
            # Extract the code block if present
            content_parts = doc.page_content.split('Code:\n')
            code_preview = content_parts[1].split('\n')[0] if len(content_parts) > 1 else ""
            if len(code_preview) > 200:
                code_preview = code_preview[:200] + "..."

            # Extract relationships if present
            relationships = []
            if "Related functions:" in doc.page_content:
                rel_section = doc.page_content.split("Related functions:")[-1].strip()
                relationships = [r.strip() for r in rel_section.split(",")]

            # Format the result
            formatted_content = {
                "content": doc.page_content,
                "code_preview": code_preview,
                "metadata": doc.metadata,
                "relationships": relationships,
                "file_path": doc.metadata.get("file_path", "")
            }
            formatted_results.append((formatted_content, float(score)))

        logging.info(f"Found {len(formatted_results)} relevant code sections")
        return formatted_results

    except Exception as e:
        logging.error(f"Error during graph data search: {e}")
        raise e
