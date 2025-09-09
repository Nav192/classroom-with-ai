from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from ..dependencies import get_supabase, get_current_user, get_current_teacher_user
from supabase import Client

router = APIRouter()

# --- Pydantic Models ---
class QuestionIn(BaseModel):
    text: str
    type: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None

class QuizIn(BaseModel):
    class_id: str
    topic: str
    type: str
    duration_minutes: int
    questions: List[QuestionIn]

class QuestionOut(QuestionIn):
    id: UUID
    class Config: { "from_attributes": True }

class QuizOut(BaseModel):
    id: UUID
    topic: str
    type: str
    class Config: { "from_attributes": True }

class QuizWithQuestions(QuizOut):
    questions: List[QuestionOut]

# --- Endpoints ---
@router.post("", status_code=status.HTTP_201_CREATED, response_model=QuizOut)
def create_quiz(
    payload: QuizIn,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Membuat kuis baru beserta pertanyaannya. Hanya untuk Guru."""
    teacher_id = current_teacher.get("id")

    if any(q.type != payload.type for q in payload.questions):
        raise HTTPException(status_code=400, detail="Semua tipe pertanyaan harus sama dengan tipe kuis.")

    try:
        quiz_res = sb.table("quizzes").insert({
            "class_id": payload.class_id,
            "topic": payload.topic,
            "type": payload.type,
            "duration_minutes": payload.duration_minutes,
            "user_id": teacher_id,
        }).execute()
        
        if not quiz_res.data:
            raise HTTPException(status_code=500, detail="Gagal membuat kuis.")
        
        new_quiz = quiz_res.data[0]
        questions_to_insert = [
            {**q.model_dump(), "quiz_id": new_quiz['id']} for q in payload.questions
        ]
        
        questions_res = sb.table("questions").insert(questions_to_insert).execute()

        if not questions_res.data:
            sb.table("quizzes").delete().eq("id", new_quiz['id']).execute()
            raise HTTPException(status_code=500, detail="Gagal membuat pertanyaan untuk kuis.")

        return new_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")

@router.get("", response_model=List[QuizOut])
def list_quizzes(
    class_id: str | None = None,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Menampilkan daftar kuis yang tersedia. Untuk semua pengguna yang login."""
    query = sb.table("quizzes").select("id, topic, type, class_id")
    if class_id:
        query = query.eq("class_id", class_id)
    
    return query.order("created_at", desc=True).execute().data or []

@router.get("/{quiz_id}", response_model=QuizWithQuestions)
def get_quiz(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mengambil detail kuis beserta semua pertanyaannya."""
    quiz_res = sb.table("quizzes").select("*").eq("id", quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Kuis tidak ditemukan")

    questions_res = sb.table("questions").select("*").eq("quiz_id", quiz_id).execute()
    
    return {**quiz_res.data, "questions": questions_res.data or []}