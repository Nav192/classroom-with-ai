from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from supabase import Client
from ..dependencies import get_supabase, get_current_teacher_user, verify_class_membership

router = APIRouter()

class StudentQuizStatus(BaseModel):
    student_id: UUID
    username: str
    status: str
    score: Optional[int] = None
    total: Optional[int] = None
    percentage: Optional[float] = None

@router.get("/teacher/class/{class_id}/quiz/{quiz_id}/status", response_model=List[StudentQuizStatus], dependencies=[Depends(verify_class_membership)])
def get_student_quiz_status(
    class_id: UUID,
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    # 1. Get all students in the class
    class_members_res = sb.table("class_members").select("profiles(id, username, role)").eq("class_id", str(class_id)).execute()
    if not class_members_res.data:
        return []

    students = [{ "student_id": member["profiles"]["id"], "username": member["profiles"]["username"]} for member in class_members_res.data if member.get("profiles") and member["profiles"]["role"] == "student"]

    student_ids = [student["student_id"] for student in students]

    # 2. Get the latest results for these students for the given quiz
    results_res = sb.table("results").select("user_id, score, total, created_at").eq("quiz_id", str(quiz_id)).in_("user_id", student_ids).order("created_at", desc=True).execute()
    
    latest_results = {}
    for result in results_res.data:
        user_id = result["user_id"]
        if user_id not in latest_results:
            latest_results[user_id] = result

    # 3. Combine the data
    response_data = []
    for student in students:
        student_id = student["student_id"]
        result = latest_results.get(student_id)

        if result:
            percentage = (result["score"] / result["total"]) * 100 if result["total"] > 0 else 0
            response_data.append(
                StudentQuizStatus(
                    student_id=student_id,
                    username=student["username"],
                    status="Completed",
                    score=result["score"],
                    total=result["total"],
                    percentage=round(percentage, 2),
                )
            )
        else:
            response_data.append(
                StudentQuizStatus(
                    student_id=student_id,
                    username=student["username"],
                    status="Not Started",
                )
            )

    return response_data
