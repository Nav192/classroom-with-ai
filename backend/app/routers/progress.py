from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from ..dependencies import get_supabase, get_current_user
from supabase import Client

router = APIRouter()

# --- Pydantic Models ---
class MaterialProgressItem(BaseModel):
    id: UUID
    user_id: UUID
    material_id: UUID
    status: str
    class Config:
        from_attributes = True

class QuizResultItem(BaseModel):
    id: UUID
    quiz_id: UUID
    user_id: UUID
    score: int
    total: int
    class Config:
        from_attributes = True

class ProgressResponse(BaseModel):
    user_id: UUID
    overall_percentage: float
    materials: dict
    quizzes: dict

# --- Dependency for Authorization ---
async def get_authorized_user_id_for_progress(
    user_id: UUID,
    current_user: dict = Depends(get_current_user),
) -> UUID:
    """
    Memastikan bahwa pengguna saat ini diotorisasi untuk melihat progres pengguna yang diminta.
    - Admin/Guru dapat melihat progres pengguna mana pun.
    - Siswa hanya dapat melihat progres mereka sendiri.
    """
    if current_user.get("role") == "student":
        if str(current_user.get("id")) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Siswa hanya dapat melihat progres mereka sendiri."
            )
    return user_id

# --- Endpoints ---

@router.get("/{user_id}", response_model=ProgressResponse)
def get_progress(
    user_id: UUID,
    sb: Client = Depends(get_supabase),
    authorized_user_id: UUID = Depends(get_authorized_user_id_for_progress),
):
    """Mengambil progres belajar untuk pengguna tertentu."""
    if str(user_id) != str(authorized_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses tidak sah ke data progres.")

    try:
        materials_progress = sb.table("materials_progress").select("*").eq("user_id", user_id).execute().data or []
        all_materials = sb.table("materials").select("id").execute().data or []
        
        quiz_results = sb.table("results").select("*").eq("user_id", user_id).execute().data or []
        all_quizzes = sb.table("quizzes").select("id").execute().data or []
        
        materials_completed = len([m for m in materials_progress if m.get("status") == "completed"])
        materials_total = len(all_materials)
        materials_percentage = (materials_completed / materials_total * 100) if materials_total > 0 else 0
        
        quizzes_completed = len(set(r.get("quiz_id") for r in quiz_results))
        quizzes_total = len(all_quizzes)
        quizzes_percentage = (quizzes_completed / quizzes_total * 100) if quizzes_total > 0 else 0
        
        overall_percentage = ((materials_percentage + quizzes_percentage) / 2) if (materials_total > 0 or quizzes_total > 0) else 0
        
        return {
            "user_id": user_id,
            "overall_percentage": round(overall_percentage, 1),
            "materials": {
                "completed": materials_completed,
                "total": materials_total,
                "percentage": round(materials_percentage, 1),
                "progress": materials_progress
            },
            "quizzes": {
                "completed": quizzes_completed,
                "total": quizzes_total,
                "percentage": round(quizzes_percentage, 1),
                "results": quiz_results
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")