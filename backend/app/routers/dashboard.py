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
    overall_weighted_average_score: Optional[float] = None

class QuizOverview(BaseModel):
    id: UUID
    topic: str
    weight: int

class StudentOverallAverage(BaseModel):
    student_id: UUID
    username: str
    overall_weighted_average_score: Optional[float] = None

class ClassOverallAverages(BaseModel):
    class_id: UUID
    class_name: str
    quizzes: List[QuizOverview]
    students: List[StudentOverallAverage]

@router.get("/teacher/class/{class_id}/quiz/{quiz_id}/status", response_model=List[StudentQuizStatus], dependencies=[Depends(verify_class_membership)])
def get_student_quiz_status(
    class_id: UUID,
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    # 1. Get quiz info (for max_attempts of the specific quiz)
    quiz_res = sb.table("quizzes").select("max_attempts").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    specific_quiz_max_attempts = quiz_res.data.get("max_attempts", 1)

    # 2. Get all students in the class
    class_members_res = sb.table("class_members").select("profiles(id, username, role)").eq("class_id", str(class_id)).execute()
    if not class_members_res.data:
        return []

    students = [{ "student_id": member["profiles"]["id"], "username": member["profiles"]["username"]} for member in class_members_res.data if member.get("profiles") and member["profiles"]["role"] == "student"]
    student_map = {s["student_id"]: s["username"] for s in students}
    student_ids = list(student_map.keys())

    # 3. Get all quizzes in the class with their weights
    all_class_quizzes_res = sb.table("quizzes").select("id, weight, max_attempts").eq("class_id", str(class_id)).execute()
    all_class_quizzes = {q['id']: {'weight': q['weight'], 'max_attempts': q['max_attempts']} for q in all_class_quizzes_res.data}
    all_class_quiz_ids = list(all_class_quizzes.keys())

    # 4. Get all results for all students for all quizzes in this class
    all_results_res = sb.table("results").select("user_id, quiz_id, score, total, created_at").in_("user_id", student_ids).in_("quiz_id", all_class_quiz_ids).execute()
    all_results_data = all_results_res.data or []

    # 5. Group all results by student and then by quiz to find the highest score for each quiz
    student_quiz_highest_scores = {}
    for result in all_results_data:
        user_id = result["user_id"]
        quiz_id_res = result["quiz_id"]
        score = result["score"]
        if user_id not in student_quiz_highest_scores:
            student_quiz_highest_scores[user_id] = {}
        
        current_highest = student_quiz_highest_scores[user_id].get(quiz_id_res)
        if not current_highest or (score is not None and current_highest['score'] is not None and score > current_highest['score']):
            student_quiz_highest_scores[user_id][quiz_id_res] = result

    # 6. Process each student's results to calculate specific quiz status and overall weighted average
    response_data = []
    for student_id, username in student_map.items():
        specific_quiz_status = "Not Started"
        specific_quiz_score = None
        specific_quiz_total = None
        specific_quiz_percentage = None
        specific_quiz_attempts_taken = 0

        overall_weighted_sum_scores = 0
        overall_total_weights = 0
        
        student_all_quiz_results = student_quiz_highest_scores.get(student_id, {})

        for q_id, quiz_info in all_class_quizzes.items():
            quiz_weight = quiz_info['weight']
            quiz_max_attempts = quiz_info['max_attempts']
            
            if q_id in student_all_quiz_results:
                latest_result = student_all_quiz_results[q_id]
                score = latest_result['score']
                total = latest_result['total']
                
                # For overall average calculation
                overall_weighted_sum_scores += (score * quiz_weight)
                overall_total_weights += quiz_weight

                # For specific quiz status (if this is the quiz_id we're looking for)
                if q_id == str(quiz_id):
                    specific_quiz_status = "Completed"
                    specific_quiz_score = score
                    specific_quiz_total = total
                    specific_quiz_percentage = round((score / total) * 100, 2) if total > 0 else 0
                    # Need to fetch attempts taken for this specific quiz
                    attempts_res = sb.table("results").select("id").eq("user_id", student_id).eq("quiz_id", str(quiz_id)).execute()
                    specific_quiz_attempts_taken = len(attempts_res.data)
            elif q_id == str(quiz_id): # If the specific quiz was not attempted
                specific_quiz_status = "Not Started"
                specific_quiz_attempts_taken = 0

        overall_weighted_average_score = 0.0
        if overall_total_weights > 0:
            overall_weighted_average_score = round(overall_weighted_sum_scores / overall_total_weights, 2)

        response_data.append(
            StudentQuizStatus(
                student_id=student_id,
                username=username,
                status=specific_quiz_status,
                score=specific_quiz_score,
                total=specific_quiz_total,
                percentage=specific_quiz_percentage,
                attempts_taken=specific_quiz_attempts_taken,
                max_attempts=specific_quiz_max_attempts,
                overall_weighted_average_score=overall_weighted_average_score,
            )
        )
    return response_data

@router.get("/teacher/class/{class_id}/overall_student_averages", response_model=ClassOverallAverages, dependencies=[Depends(verify_class_membership)])
def get_class_overall_student_averages(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    print(f"DEBUG: get_class_overall_student_averages endpoint hit for class_id: {class_id}")
    # 1. Get class info
    class_res = sb.table("classes").select("class_name").eq("id", str(class_id)).single().execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="Class not found.")
    class_name = class_res.data.get("class_name")

    # 2. Get all students in the class
    class_members_res = sb.table("class_members").select("profiles(id, username, role)").eq("class_id", str(class_id)).execute()
    if not class_members_res.data:
        return ClassOverallAverages(class_id=class_id, class_name=class_name, quizzes=[], students=[])

    students = [{ "student_id": member["profiles"]["id"], "username": member["profiles"]["username"]} for member in class_members_res.data if member.get("profiles") and member["profiles"]["role"] == "student"]
    student_map = {s["student_id"]: s["username"] for s in students}
    student_ids = list(student_map.keys())

    # 3. Get all quizzes in the class with their weights
    all_class_quizzes_res = sb.table("quizzes").select("id, topic, weight").eq("class_id", str(class_id)).execute()
    all_class_quizzes = {q['id']: {'topic': q['topic'], 'weight': q['weight']} for q in all_class_quizzes_res.data}
    all_class_quiz_ids = list(all_class_quizzes.keys())

    # Prepare quizzes for response model
    quizzes_overview = [QuizOverview(id=UUID(q_id), topic=q_info['topic'], weight=q_info['weight']) for q_id, q_info in all_class_quizzes.items()]

    if not all_class_quiz_ids:
        return ClassOverallAverages(class_id=class_id, class_name=class_name, quizzes=quizzes_overview, students=[])

    # 4. Get all results for all students for all quizzes in this class
    all_results_res = sb.table("results").select("user_id, quiz_id, score, created_at").in_("user_id", student_ids).in_("quiz_id", all_class_quiz_ids).execute()
    all_results_data = all_results_res.data or []

    # 5. Group all results by student and then by quiz to find the highest score for each quiz
    student_quiz_highest_scores = {}
    for result in all_results_data:
        user_id = result["user_id"]
        quiz_id_res = result["quiz_id"]
        score = result["score"]
        if user_id not in student_quiz_highest_scores:
            student_quiz_highest_scores[user_id] = {}
        
        current_highest = student_quiz_highest_scores[user_id].get(quiz_id_res)
        if not current_highest or (score is not None and current_highest['score'] is not None and score > current_highest['score']):
            student_quiz_highest_scores[user_id][quiz_id_res] = result

    # 6. Calculate overall weighted average for each student
    students_overall_averages = []
    for student_id, username in student_map.items():
        overall_weighted_sum_scores = 0
        overall_total_weights = 0
        
        student_all_quiz_results = student_quiz_highest_scores.get(student_id, {})

        for q_id, quiz_info in all_class_quizzes.items():
            quiz_weight = quiz_info['weight']
            
            if q_id in student_all_quiz_results:
                latest_result = student_all_quiz_results[q_id]
                score = latest_result['score']
                
                overall_weighted_sum_scores += (score * quiz_weight)
                overall_total_weights += quiz_weight

        overall_weighted_average_score = None
        if overall_total_weights > 0:
            overall_weighted_average_score = round(overall_weighted_sum_scores / overall_total_weights, 2)

        students_overall_averages.append(
            StudentOverallAverage(
                student_id=UUID(student_id),
                username=username,
                overall_weighted_average_score=overall_weighted_average_score,
            )
        )
    
    return ClassOverallAverages(
        class_id=class_id,
        class_name=class_name,
        quizzes=quizzes_overview,
        students=students_overall_averages
    )
