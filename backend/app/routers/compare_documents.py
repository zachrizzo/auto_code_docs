# app/routers/compare_documents.py

from fastapi import APIRouter, HTTPException
import logging
import hashlib
import json

from app.models import CollectionRequest
from firebase_admin import credentials, firestore
from firebase_admin.exceptions import FirebaseError
import firebase_admin

from app.database.firebase import fetch_and_list_doc_types

router = APIRouter()

@router.post("/compare-documents")
async def compare_documents(request: CollectionRequest):
    """Endpoint to compare documents in a Firebase collection."""
    collection_name = request.collection_name
    service_account = request.service_account

    logging.info(f"Comparing documents in collection: {collection_name}")

    try:
        service_account_hash = hashlib.sha256(json.dumps(service_account, sort_keys=True).encode()).hexdigest()
        if service_account_hash not in firebase_admin._apps:
            cred = credentials.Certificate(service_account)
            firebase_admin.initialize_app(cred, name=service_account_hash)

        logging.info('Initialized Firebase Admin SDK')

        db = firestore.client(firebase_admin.get_app(service_account_hash))
        discrepancies = fetch_and_list_doc_types(db, collection_name)
        if "error" in discrepancies:
            return {"error": discrepancies["error"], "discrepancies": discrepancies["document_types"]}

        return {"discrepancies": discrepancies}
    except FirebaseError as e:
        logging.error(f"FirebaseError: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize Firebase Admin SDK.")
    except Exception as e:
        logging.error(f"Exception: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch and compare documents.")
