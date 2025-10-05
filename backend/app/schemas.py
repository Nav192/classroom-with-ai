from pydantic import BaseModel
from typing import List, Dict, Any

class QuizGenerationRequest(BaseModel):
    material_id: str
    num_questions: int
    difficulty: str # e.g., "easy", "medium", "hard"
    quiz_type: str # e.g., "multiple_choice", "essay"

class QuizGenerationResponse(BaseModel):
    quiz_data: Dict[str, Any] # Assuming quiz_data is a dictionary
