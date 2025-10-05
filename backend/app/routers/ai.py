import httpx # New import for making HTTP requests
from fastapi import APIRouter, Depends, HTTPException, status # Added this line
from pydantic import BaseModel
from backend.app.dependencies import get_current_user, get_raw_token # Modified import
from backend.app.schemas import QuizGenerationRequest, QuizGenerationResponse
from backend.app.services.rag import rag_service
from ..config import settings # New import for settings

router = APIRouter()

# New Pydantic model for AI chat request
class AIChatRequest(BaseModel):
    question: str

@router.post("/generate-quiz", response_model=QuizGenerationResponse)
async def generate_quiz_endpoint(
    request: QuizGenerationRequest,
    current_user: str = Depends(get_raw_token), # Changed to get_raw_token
):
    try:
        # Construct the URL for the Supabase Edge Function
        edge_function_url = f"{settings.supabase_url}/functions/v1/generate-quiz"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {current_user}" # current_user is now the raw JWT token
        }
        payload = {
            "material_id": request.material_id,
            "question_type": request.quiz_type, # Map quiz_type to question_type for Edge Function
            "num_questions": request.num_questions
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(edge_function_url, headers=headers, json=payload)
            response.raise_for_status() # Raise an exception for 4xx/5xx responses

            edge_function_response = response.json()
            
            # The Edge Function returns a JSON with a "questions" key
            # We need to wrap it in quiz_data for QuizGenerationResponse
            return QuizGenerationResponse(quiz_data=edge_function_response) # Assuming edge_function_response is already the quiz_data

    except httpx.HTTPStatusError as e:
        print(f"HTTP error calling generate-quiz Edge Function: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Error from quiz generation service: {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error calling generate-quiz Edge Function: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Network error calling quiz generation service: {e}")
    except Exception as e:
        print(f"Error in generate_quiz_endpoint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# New endpoint for AI chat
@router.post("/chat/{class_id}")
async def ai_chat_endpoint(
    class_id: str,
    request: AIChatRequest,
    current_user: str = Depends(get_raw_token), # Changed to get_raw_token
):
    try:
        response = await rag_service.get_ai_response_for_class(
            user_id=current_user, # user_id is now the raw JWT token
            class_id=class_id,
            question=request.question
        )
        return {"response": response}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
