from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from ..dependencies import get_supabase, get_current_user, get_current_student_user
from supabase import Client

router = APIRouter()

# --- Pydantic Models ---
class AnswerSubmit(BaseModel):
    question_id: UUID
    response: str

class SubmitQuizRequest(BaseModel):
    quiz_id: UUID
    answers: List[AnswerSubmit]
    started_at: datetime
    ended_at: datetime

class QuizAnswerOut(BaseModel):
    id: UUID
    result_id: UUID
    question_id: UUID
    user_id: UUID
    answer: str
    is_correct: Optional[bool]
    created_at: datetime
    class Config:
        from_attributes = True

class ResultOut(BaseModel):
    id: UUID
    quiz_id: UUID
    user_id: UUID
    score: int
    total: int
    attempt_number: int
    started_at: datetime
    ended_at: datetime
    created_at: datetime
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.post("/submit", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
async def submit_quiz(
    payload: SubmitQuizRequest,
    sb: Client = Depends(get_supabase),
    current_student: dict = Depends(get_current_student_user),
):
    """Mengirimkan kuis, menilai otomatis, dan menyimpan hasil serta jawaban individu."""
    student_id = current_student.get("id")

    # 1. Periksa detail kuis dan batas percobaan
    quiz_res = sb.table("quizzes").select("type, max_attempts").eq("id", payload.quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Kuis tidak ditemukan.")
    
    quiz_type = quiz_res.data['type']
    max_attempts = quiz_res.data['max_attempts']

    previous_attempts_res = sb.table("results").select("attempt_number").eq("quiz_id", payload.quiz_id).eq("user_id", student_id).order("attempt_number", desc=True).limit(1).execute()
    current_attempt_number = 1
    if previous_attempts_res.data:
        last_attempt = previous_attempts_res.data[0]['attempt_number']
        current_attempt_number = last_attempt + 1
        if current_attempt_number > max_attempts:
            raise HTTPException(status_code=403, detail=f"Batas maksimum percobaan ({max_attempts}) untuk kuis ini telah tercapai.")

    # 2. Ambil semua pertanyaan untuk penilaian
    questions_res = sb.table("questions").select("id, type, answer").eq("quiz_id", payload.quiz_id).execute()
    quiz_questions = {q['id']: q for q in questions_res.data}

    score = 0
    total_questions = len(payload.answers)
    answers_to_insert = []

    for submitted_answer in payload.answers:
        question_data = quiz_questions.get(str(submitted_answer.question_id))
        if not question_data:
            raise HTTPException(status_code=400, detail=f"Pertanyaan {submitted_answer.question_id} tidak ditemukan dalam kuis.")

        is_correct = None
        if question_data['type'] in ['mcq', 'true_false']:
            if str(question_data['answer']).strip().lower() == str(submitted_answer.response).strip().lower():
                score += 1
                is_correct = True
            else:
                is_correct = False

        answers_to_insert.append({
            "result_id": None,
            "question_id": submitted_answer.question_id,
            "user_id": student_id,
            "answer": submitted_answer.response,
            "is_correct": is_correct,
        })

    # 3. Masukkan record hasil utama
    result_insert_res = sb.table("results").insert({
        "quiz_id": payload.quiz_id,
        "user_id": student_id,
        "score": score,
        "total": total_questions,
        "attempt_number": current_attempt_number,
        "started_at": payload.started_at.isoformat(),
        "ended_at": payload.ended_at.isoformat(),
    }).execute()

    if not result_insert_res.data:
        raise HTTPException(status_code=500, detail="Gagal menyimpan hasil kuis.")
    
    new_result = result_insert_res.data[0]
    result_id = new_result['id']

    # 4. Perbarui jawaban individu dengan result_id dan masukkan
    for answer_data in answers_to_insert:
        answer_data['result_id'] = result_id
    
    sb.table("quiz_answers").insert(answers_to_insert).execute()

    return new_result


@router.get("/history", response_model=List[ResultOut])
def get_quiz_history(
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mengambil riwayat kuis untuk pengguna saat ini."""
    user_id = current_user.get("id")
    
    response = sb.table("results").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return response.data or []

@router.get("/history/{result_id}", response_model=ResultOut)
def get_single_result(
    result_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mengambil satu hasil kuis berdasarkan ID untuk pengguna saat ini."""
    user_id = current_user.get("id")
    
    response = sb.table("results").select("*").eq("id", result_id).eq("user_id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Hasil tidak ditemukan atau Anda tidak memiliki izin.")
    return response.data

@router.get("/history/{result_id}/answers", response_model=List[QuizAnswerOut])
def get_result_answers(
    result_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Mengambil jawaban individu untuk hasil kuis tertentu untuk pengguna saat ini."""
    user_id = current_user.get("id")
    
    result_check = sb.table("results").select("id").eq("id", result_id).eq("user_id", user_id).single().execute()
    if not result_check.data:
        raise HTTPException(status_code=404, detail="Hasil tidak ditemukan atau Anda tidak memiliki izin.")

    response = sb.table("quiz_answers").select("*").eq("result_id", result_id).order("created_at", asc=True).execute()
    return response.data or []