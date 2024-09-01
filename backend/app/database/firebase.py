from typing import List, Dict

def fetch_and_list_doc_types(admin_db, collection_name: str) -> List[Dict[str, List[str]]]:
    doc_types = {}

    try:
        col_ref = admin_db.collection(collection_name)
        docs_snapshot = col_ref.stream()

        for doc in docs_snapshot:
            try:
                doc_data = doc.to_dict()
                doc_type = determine_doc_type(doc_data)

                if doc_type not in doc_types:
                    doc_types[doc_type] = []
                doc_types[doc_type].append(doc.id)

            except Exception as e:
                print(f"Error processing document {doc.id}: {e}")
                # Log or handle the error, but continue with the next document

    except Exception as e:
        print(f"Error fetching documents: {e}")
        # Return an error message in the response but allow the function to continue
        return {"error": f"Error fetching documents: {e}", "document_types": format_document_types(doc_types)}

    return format_document_types(doc_types)

def determine_doc_type(doc_data: Dict) -> str:
    return '_'.join(sorted(doc_data.keys()))

def format_document_types(doc_types: Dict[str, List[str]]) -> List[Dict[str, List[str]]]:
    formatted_types = []

    for doc_type, doc_ids in doc_types.items():
        formatted_types.append({
            "type": doc_type,
            "structure": doc_type.split('_'),  # Split the type back into the list of keys
            "documents": doc_ids
        })

    return formatted_types
