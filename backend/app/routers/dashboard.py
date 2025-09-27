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
    attempts_taken: int
    max_attempts: int
    attempts_taken: int
    max_attempts: int

@router.get("/teacher/class/{class_id}/quiz/{quiz_id}/status", response_model=List[StudentQuizStatus], dependencies=[Depends(verify_class_membership)])
def get_student_quiz_status(
    class_id: UUID,
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    # 1. Get quiz info (for max_attempts)
    quiz_res = sb.table("quizzes").select("max_attempts").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    max_attempts = quiz_res.data.get("max_attempts", 1)

    # 2. Get all students in the class
    class_members_res = sb.table("class_members").select("profiles(id, username, role)").eq("class_id", str(class_id)).execute()
    if not class_members_res.data:
        return []

    students = [{ "student_id": member["profiles"]["id"], "username": member["profiles"]["username"]} for member in class_members_res.data if member.get("profiles") and member["profiles"]["role"] == "student"]
    student_map = {s["student_id"]: s["username"] for s in students}
    student_ids = list(student_map.keys())

    # 3. Get all results for these students for the given quiz
    results_res = sb.table("results").select("user_id, score, total").eq("quiz_id", str(quiz_id)).in_("user_id", student_ids).execute()

    # 4. Group results by student
    results_by_student = {}
    for result in results_res.data:
        user_id = result["user_id"]
        if user_id not in results_by_student:
            results_by_student[user_id] = []
        results_by_student[user_id].append(result)

    # 5. Process each student's results to find the best attempt
    response_data = []
    for student_id, username in student_map.items():
        student_results = results_by_student.get(student_id)

        if not student_results:
            response_data.append(
                StudentQuizStatus(
                    student_id=student_id,
                    username=username,
                    status="Not Started",
                    attempts_taken=0,
                    max_attempts=max_attempts,
                )
            )
        else:
            # Find best attempt
            best_attempt = max(student_results, key=lambda r: r['score'])
            attempts_taken = len(student_results)
            percentage = (best_attempt["score"] / best_attempt["total"]) * 100 if best_attempt["total"] > 0 else 0

            response_data.append(
                StudentQuizStatus(
                    student_id=student_id,
                    username=username,
                    status="Completed",
                    score=best_attempt["score"],
                    total=best_attempt["total"],
                    percentage=round(percentage, 2),
                    attempts_taken=attempts_taken,
                    max_attempts=max_attempts,
                )
            )

    return response_data
