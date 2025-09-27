from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from uuid import UUID
import supabase
from ..dependencies import get_supabase, get_supabase_admin, get_current_user

router = APIRouter()

class QuizWeights(BaseModel):
    mcq: int
    true_false: int
    essay: int

@router.get("/{class_id}/quiz-weights", response_model=QuizWeights, summary="Get quiz weights for a class")
def get_quiz_weights(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    # Authorization check: ensure user is a teacher/admin and member of the class
    user_id = user.get("id")
    # You might want to add more robust authorization here, e.g., check if the user is the teacher of the class

    weights_res = db.table("quiz_weights").select("mcq_weight, true_false_weight, essay_weight").eq("class_id", str(class_id)).single().execute()

    if not weights_res.data:
        raise HTTPException(status_code=404, detail="Quiz weights not set for this class.")

    return {
        "mcq": weights_res.data.get("mcq_weight", 0),
        "true_false": weights_res.data.get("true_false_weight", 0),
        "essay": weights_res.data.get("essay_weight", 0)
    }

@router.post("/{class_id}/quiz-weights", status_code=status.HTTP_201_CREATED, summary="Set or update quiz weights for a class")
def set_quiz_weights(
    class_id: UUID,
    weights: QuizWeights,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin) # Use admin for upsert
):
    # Authorization check
    user_id = user.get("id")
    # Add robust authorization to ensure only the teacher of the class can set weights

    try:
        db.table("quiz_weights").upsert({
            "class_id": str(class_id),
            "mcq_weight": weights.mcq,
            "true_false_weight": weights.true_false,
            "essay_weight": weights.essay
        }, on_conflict="class_id").execute()

        return {"message": "Quiz weights saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
