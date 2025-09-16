from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from supabase import Client

from ..dependencies import get_supabase, get_current_user, get_current_teacher_user, verify_class_membership

router = APIRouter()

# --- Pydantic Models ---
class StudentProgressSummary(BaseModel):
    user_id: UUID
    email: str # Assuming we can fetch this
    materials_completed: int
    quizzes_attempted: int
    overall_progress: float

class ClassProgressResponse(BaseModel):
    class_id: UUID
    total_materials: int
    total_quizzes: int
    student_summaries: List[StudentProgressSummary]

class MyProgressResponse(BaseModel):
    class_id: UUID
    materials_completed: int
    total_materials: int
    quizzes_attempted: int
    total_quizzes: int
    overall_progress: float

class StudentProgressDetail(BaseModel):
    user_id: UUID
    username: str
    email: str
    materials_completed: int
    quizzes_attempted: int
    average_score: Optional[float] = None

# --- Endpoints ---

@router.get("/class/{class_id}", response_model=ClassProgressResponse, dependencies=[Depends(verify_class_membership)])
def get_class_progress(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get progress summary for all students in a specific class."""
    try:
        # Get total materials and quizzes for the class
        materials_in_class = sb.table("materials").select("id", count='exact').eq("class_id", str(class_id)).execute()
        quizzes_in_class = sb.table("quizzes").select("id", count='exact').eq("class_id", str(class_id)).execute()
        total_materials = materials_in_class.count
        total_quizzes = quizzes_in_class.count

        # Get all students in the class
        class_members = sb.table("class_members").select("user_id").eq("class_id", str(class_id)).execute().data or []
        student_ids = [member['user_id'] for member in class_members]

        if not student_ids:
            return ClassProgressResponse(class_id=class_id, total_materials=total_materials, total_quizzes=total_quizzes, student_summaries=[])

        # Get profiles to filter for students and get emails
        student_profiles = sb.table("profiles").select("id, email, role").in_("id", student_ids).eq("role", "student").execute().data or []
        student_id_map = {p['id']: p['email'] for p in student_profiles}

        # Fetch all progress data for these students
        materials_progress = sb.table("materials_progress").select("user_id, status").in_("user_id", list(student_id_map.keys())).execute().data or []
        quiz_results = sb.table("results").select("user_id, quiz_id").in_("user_id", list(student_id_map.keys())).execute().data or []

        summaries = []
        for student_id, student_email in student_id_map.items():
            mats_completed = len([p for p in materials_progress if p['user_id'] == student_id and p['status'] == 'completed'])
            quizzes_attempted = len(set(r['quiz_id'] for r in quiz_results if r['user_id'] == student_id))
            
            mat_progress = (mats_completed / total_materials * 100) if total_materials > 0 else 0
            quiz_progress = (quizzes_attempted / total_quizzes * 100) if total_quizzes > 0 else 0
            overall = (mat_progress + quiz_progress) / 2

            summaries.append(StudentProgressSummary(
                user_id=student_id,
                email=student_email,
                materials_completed=mats_completed,
                quizzes_attempted=quizzes_attempted,
                overall_progress=round(overall, 1)
            ))

        return ClassProgressResponse(class_id=class_id, total_materials=total_materials, total_quizzes=total_quizzes, student_summaries=summaries)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/my/{class_id}", response_model=MyProgressResponse, dependencies=[Depends(verify_class_membership)])
def get_my_progress_in_class(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """(For Students) Get personal progress in a specific class."""
    user_id = current_user.get("id")

    try:
        # Get total materials and quizzes for the class
        materials_in_class = sb.table("materials").select("id", count='exact').eq("class_id", str(class_id)).execute()
        quizzes_in_class = sb.table("quizzes").select("id", count='exact').eq("class_id", str(class_id)).execute()
        total_materials = materials_in_class.count
        total_quizzes = quizzes_in_class.count

        # Get user's progress
        mats_completed = sb.table("materials_progress").select("id", count='exact').eq("user_id", user_id).eq("status", "completed").execute().count
        
        # This is tricky, we need to count distinct quizzes from results that belong to this class
        quiz_results = sb.table("results").select("quiz_id").eq("user_id", user_id).execute().data or []
        attempted_quiz_ids = list(set(r['quiz_id'] for r in quiz_results))
        
        quizzes_attempted = 0
        if attempted_quiz_ids:
            quizzes_attempted = sb.table("quizzes").select("id", count='exact').in_("id", attempted_quiz_ids).eq("class_id", str(class_id)).execute().count

        mat_progress = (mats_completed / total_materials * 100) if total_materials > 0 else 0
        quiz_progress = (quizzes_attempted / total_quizzes * 100) if total_quizzes > 0 else 0
        overall = (mat_progress + quiz_progress) / 2

        return MyProgressResponse(
            class_id=class_id,
            materials_completed=mats_completed,
            total_materials=total_materials,
            quizzes_attempted=quizzes_attempted,
            total_quizzes=total_quizzes,
            overall_progress=round(overall, 1)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/class/{class_id}/students", response_model=List[StudentProgressDetail], dependencies=[Depends(verify_class_membership)])
def get_student_progress_in_class(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get detailed progress for all students in a specific class."""
    try:
        # Get all students in the class
        class_members = sb.table("class_members").select("user_id").eq("class_id", str(class_id)).execute().data or []
        student_ids = [member['user_id'] for member in class_members]

        if not student_ids:
            return []

        # Get profiles to filter for students and get emails/usernames
        student_profiles = sb.table("profiles").select("id, username, email, role").in_("id", student_ids).eq("role", "student").execute().data or []
        student_id_map = {p['id']: {"email": p['email'], "username": p['username']} for p in student_profiles}

        # Fetch all progress data for these students
        materials_progress = sb.table("materials_progress").select("user_id, status").in_("user_id", list(student_id_map.keys())).execute().data or []
        quiz_results = sb.table("results").select("user_id, quiz_id, score").in_("user_id", list(student_id_map.keys())).execute().data or []

        student_details = []
        for student_id, profile in student_id_map.items():
            mats_completed = len([p for p in materials_progress if p['user_id'] == student_id and p['status'] == 'completed'])
            
            student_quiz_results = [r for r in quiz_results if r['user_id'] == student_id]
            quizzes_attempted = len(set(r['quiz_id'] for r in student_quiz_results))
            
            total_score = sum(r['score'] for r in student_quiz_results)
            average_score = total_score / len(student_quiz_results) if student_quiz_results else None

            student_details.append(StudentProgressDetail(
                user_id=student_id,
                username=profile['username'],
                email=profile['email'],
                materials_completed=mats_completed,
                quizzes_attempted=quizzes_attempted,
                average_score=average_score
            ))

        return student_details

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
