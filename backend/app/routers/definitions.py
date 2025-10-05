from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List
from uuid import UUID
import google.generativeai as genai

from ..dependencies import get_current_user, get_supabase_admin
from ..config import settings
from supabase import Client # Import Client for type hinting

router = APIRouter()

# Configure Gemini for embedding generation
print(f"DEBUG: GEMINI_API_KEY from settings: {settings.gemini_api_key[:5]}...{settings.gemini_api_key[-5:] if settings.gemini_api_key else 'None'}") # Debug print
try:
    genai.configure(api_key=settings.gemini_api_key)
except Exception as e:
    print(f"Tidak dapat mengkonfigurasi Gemini API key: {e}")

embedding_model = genai.GenerativeModel('models/text-embedding-004') # No longer needed as a GenerativeModel instance

class DefinitionCreate(BaseModel):
    term: str
    definition: str
    class_id: UUID | None = None # Optional, if definition is class-specific

class DefinitionResponse(BaseModel):
    id: UUID
    term: str
    definition: str
    class_id: UUID | None
    created_at: Any # datetime object
    class Config:
        from_attributes = True

def generate_embedding(text: str) -> list[float]:
    """Generates embedding for a given text using Gemini."""
    try:
        print(f"DEBUG: Calling genai.embed_content for text: {text[:50]}...") # Debug print
        print(f"DEBUG: genai object type: {type(genai)}") # Debug print
        print(f"DEBUG: genai.embed_content type: {type(genai.embed_content)}") # Debug print
        
        # Call genai.embed_content directly
        result = genai.embed_content(model='models/text-embedding-004', content=[text], task_type="retrieval_document")
        print(f"DEBUG: Embedding result: {result}") # Debug print
        if result and 'embedding' in result and result['embedding'] and result['embedding'][0]:
            return result['embedding'][0]
        else:
            print(f"DEBUG: generate_embedding returned no valid embedding for text: {text}")
            return [] # Return empty list if no valid embedding
    except Exception as e:
        print(f"ERROR in generate_embedding for text '{text}': {e}")
        raise # Re-raise to be caught by the outer try-except

@router.post("/definitions", response_model=DefinitionResponse, status_code=status.HTTP_201_CREATED)
async def add_definition(
    definition_data: DefinitionCreate,
    sb_admin: Client = Depends(get_supabase_admin),
    current_user: dict = Depends(get_current_user),
):
    """Adds a new general definition to the database."""
    if current_user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin or teachers can add definitions.")

    try:
        # Generate embedding for the definition
        embedding = generate_embedding(definition_data.definition)
        print(f"DEBUG: Generated embedding (first 5 values): {embedding[:5] if embedding else 'None'}") # Debug print
        
        if not embedding:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate embedding for the definition.")

        # Insert into public.general_definitions
        response = sb_admin.table("general_definitions").insert({
            "term": definition_data.term,
            "definition": definition_data.definition,
            "class_id": definition_data.class_id,
            "embedding": embedding,
        }).execute()

        if not response.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add definition.")
        
        return DefinitionResponse(**response.data[0])

    except Exception as e:
        print(f"Error adding definition: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")

@router.get("/definitions", response_model=List[DefinitionResponse])
async def get_definitions(
    sb_admin: Client = Depends(get_supabase_admin),
    current_user: dict = Depends(get_current_user),
):
    """Fetches all general definitions from the database."""
    if current_user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin or teachers can view definitions.")

    try:
        response = sb_admin.table("general_definitions").select("*").execute()
        if not response.data:
            return []
        return [DefinitionResponse(**definition) for definition in response.data]
    except Exception as e:
        print(f"Error fetching definitions: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {str(e)}")
