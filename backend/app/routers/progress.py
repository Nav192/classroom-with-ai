from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from supabase import Client

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_teacher_user, verify_class_membership

router = APIRouter()

# --- Pydantic Models ---
class StudentProgressSummary(BaseModel):
    user_id: UUID
    email: str
    username: str
    materials_completed: int
    materials_progress_percentage: float
    quizzes_attempted: int
    quizzes_progress_percentage: float
    overall_progress_percentage: float

class ClassProgressResponse(BaseModel):
    class_id: UUID
    total_materials: int
    total_quizzes: int
    student_summaries: List[StudentProgressSummary]

class MyProgressResponse(BaseModel):
    class_id: UUID
    materials_completed: int
    total_materials: int
    materials_progress_percentage: float
    quizzes_attempted: int
    total_quizzes: int
    quizzes_progress_percentage: float
    weighted_average_quiz_score: float # New field for overall weighted average
    overall_progress_percentage: float

class StudentProgressDetail(BaseModel):
    user_id: UUID
    username: str
    email: str
    materials_completed: int
    quizzes_attempted: int
    average_score: Optional[float] = None

class StudentProgressDetailsResponse(BaseModel):
    total_materials: int
    student_details: List[StudentProgressDetail]

# --- Endpoints ---

@router.get("/class/{class_id}", response_model=ClassProgressResponse, dependencies=[Depends(verify_class_membership)])
def get_class_progress(
    class_id: UUID,
    sb_admin: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get progress summary for all students in a specific class."""
    try:
        materials_in_class = sb_admin.table("materials").select("id", count='exact').eq("class_id", str(class_id)).execute()
        quizzes_in_class = sb_admin.table("quizzes").select("id", count='exact').eq("class_id", str(class_id)).execute()
        total_materials = materials_in_class.count
        total_quizzes = quizzes_in_class.count
        materials_in_class_ids = [m['id'] for m in materials_in_class.data]
        quizzes_in_class_ids = [q['id'] for q in quizzes_in_class.data]

        # Get all students in the class
        class_members = sb_admin.table("class_members").select("user_id").eq("class_id", str(class_id)).execute().data or []
        student_ids = [member['user_id'] for member in class_members]

        if not student_ids:
            return ClassProgressResponse(class_id=class_id, total_materials=total_materials, total_quizzes=total_quizzes, student_summaries=[])

        # Get profiles to filter for students and get emails
        student_profiles = sb_admin.table("profiles").select("id, email, username, role").in_("id", student_ids).eq("role", "student").execute().data or []
        student_id_map = {p['id']: {'email': p['email'], 'username': p['username']} for p in student_profiles}

        # Fetch all progress data for these students for this class
        materials_progress = []
        if materials_in_class_ids:
            materials_progress = sb_admin.table("materials_progress").select("user_id, status").in_("user_id", student_ids).in_("material_id", materials_in_class_ids).execute().data or []
        
        quiz_results = []
        if quizzes_in_class_ids:
            quiz_results = sb_admin.table("results").select("user_id, quiz_id").in_("user_id", student_ids).in_("quiz_id", quizzes_in_class_ids).execute().data or []

        summaries = []
        for student_id, student_data in student_id_map.items():
            mats_completed = len([p for p in materials_progress if p['user_id'] == student_id and p['status'] == 'completed'])
            quizzes_attempted = len(set(r['quiz_id'] for r in quiz_results if r['user_id'] == student_id))
            
            mat_progress_percentage = (mats_completed / total_materials * 100) if total_materials > 0 else 0
            quiz_progress_percentage = (quizzes_attempted / total_quizzes * 100) if total_quizzes > 0 else 0

            overall_progress_percentage = round((mat_progress_percentage + quiz_progress_percentage) / 2, 2) if (mat_progress_percentage + quiz_progress_percentage) > 0 else 0
            summaries.append(StudentProgressSummary(
                user_id=student_id,
                email=student_data['email'],
                username=student_data['username'],
                materials_completed=mats_completed,
                materials_progress_percentage=round(mat_progress_percentage, 2),
                quizzes_attempted=quizzes_attempted,
                quizzes_progress_percentage=round(quiz_progress_percentage, 2),
                overall_progress_percentage=overall_progress_percentage
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
    user_id = current_user.get("id")
    print(f"DEBUG: get_my_progress_in_class called for user_id: {user_id}, class_id: {class_id}")

    try:
        materials_in_class = sb.table("materials").select("id", count='exact').eq("class_id", str(class_id)).execute()
        total_materials = materials_in_class.count
        materials_in_class_ids = [m['id'] for m in materials_in_class.data or []]
        print(f"DEBUG: total_materials: {total_materials}, materials_in_class_ids: {materials_in_class_ids}")

        quizzes_in_class_res = sb.table("quizzes").select("id, weight").eq("class_id", str(class_id)).execute()
        class_quiz_weights = {q['id']: q['weight'] for q in quizzes_in_class_res.data or []}
        total_quizzes = len(class_quiz_weights) # Total quizzes in class
        class_quiz_ids = list(class_quiz_weights.keys())
        print(f"DEBUG: total_quizzes: {total_quizzes}, class_quiz_ids: {class_quiz_ids}, class_quiz_weights: {class_quiz_weights}")

        # Get user's progress
        mats_completed = 0
        if materials_in_class_ids:
            mats_completed = sb.table("materials_progress").select("id", count='exact').eq("user_id", user_id).eq("status", "completed").in_("material_id", materials_in_class_ids).execute().count
        
        # Fetch all results for the current user in this class
        all_user_quiz_results = sb.table("results").select("quiz_id, score, total, created_at").eq("user_id", user_id).in_("quiz_id", class_quiz_ids).execute().data or []
        print(f"DEBUG: all_user_quiz_results: {all_user_quiz_results}")

        # Get the highest score for each quiz
        highest_scores_per_quiz = {}
        for result in all_user_quiz_results:
            quiz_id = result['quiz_id']
            score = result['score']
            if quiz_id not in highest_scores_per_quiz or (score is not None and highest_scores_per_quiz[quiz_id]['score'] is not None and score > highest_scores_per_quiz[quiz_id]['score']):
                highest_scores_per_quiz[quiz_id] = result
        
        quizzes_attempted = len(highest_scores_per_quiz)
        
        weighted_sum_scores = 0
        total_weights = 0

        for quiz_id, result in highest_scores_per_quiz.items():
            score = result['score']
            total = result.get('total') # Use .get for safety
            weight = class_quiz_weights.get(quiz_id, 0)

            if score is not None and total is not None and total > 0:
                score_percentage = (score / total) * 100
                weighted_sum_scores += score_percentage * weight
                total_weights += weight
        
        quiz_average_score_for_overall = 0.0 # This will be the weighted average score
        if total_weights > 0:
            quiz_average_score_for_overall = weighted_sum_scores / total_weights

        mat_progress_percentage = (mats_completed / total_materials * 100) if total_materials > 0 else 0
        # Quizzes progress percentage for student dashboard should be completion percentage
        quiz_progress_percentage = (quizzes_attempted / total_quizzes * 100) if total_quizzes > 0 else 0

        # Overall progress percentage combines material completion and weighted quiz average score
        overall_progress_percentage = round((mat_progress_percentage + quiz_average_score_for_overall) / 2, 2) if (mat_progress_percentage + quiz_average_score_for_overall) > 0 else 0
        print(f"DEBUG: Final MyProgressResponse values: mat_progress_percentage={mat_progress_percentage}, quiz_progress_percentage={quiz_progress_percentage}, overall_progress_percentage={overall_progress_percentage}")
        return MyProgressResponse(
            class_id=class_id,
            materials_completed=mats_completed,
            total_materials=total_materials,
            materials_progress_percentage=round(mat_progress_percentage, 2),
            quizzes_attempted=quizzes_attempted,
            total_quizzes=total_quizzes,
            quizzes_progress_percentage=round(quiz_progress_percentage, 2),
            weighted_average_quiz_score=round(quiz_average_score_for_overall, 2), # New field
            overall_progress_percentage=overall_progress_percentage
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/material/{material_id}/complete", status_code=status.HTTP_200_OK)
def complete_material(
    material_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """(For Students) Mark a material as completed."""
    user_id = current_user.get("id")

    try:
        # Check if material exists and belongs to a class the user is in
        material_response = sb.table("materials").select("id, class_id").eq("id", str(material_id)).single().execute()
        if not material_response.data:
            raise HTTPException(status_code=404, detail="Material not found.")
        
        class_id = material_response.data["class_id"]
        
        # Verify user is a member of the class
        membership_response = sb.table("class_members").select("user_id").eq("user_id", user_id).eq("class_id", class_id).single().execute()
        if not membership_response.data:
            raise HTTPException(status_code=403, detail="User is not a member of the class this material belongs to.")

        # Upsert (insert or update) the progress status
        # If a record exists, update it to 'completed'. If not, create one.
        sb.table("materials_progress").upsert({
            "user_id": user_id,
            "material_id": str(material_id),
            "status": "completed"
        }, on_conflict="user_id,material_id").execute()

        return {"message": "Material marked as completed."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/class/{class_id}/students", response_model=StudentProgressDetailsResponse, dependencies=[Depends(verify_class_membership)])
def get_student_progress_in_class(
    class_id: UUID,
    sb_admin: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get detailed progress for all students in a specific class."""
    try:
        # Get total materials for the class
        materials_in_class = sb_admin.table("materials").select("id", count='exact').eq("class_id", str(class_id)).execute()
        total_materials = materials_in_class.count

        # Get all students in the class
        class_members = sb_admin.table("class_members").select("user_id").eq("class_id", str(class_id)).execute().data or []
        student_ids = [member['user_id'] for member in class_members]

        if not student_ids:
            return StudentProgressDetailsResponse(total_materials=total_materials, student_details=[])

        # Get profiles to filter for students and get emails/usernames
        student_profiles = sb_admin.table("profiles").select("id, username, email, role").in_("id", student_ids).eq("role", "student").execute().data or []
        student_id_map = {p['id']: {"email": p['email'], "username": p['username']} for p in student_profiles}

        # Fetch all progress data for these students for this class
        materials_in_class_ids = [m['id'] for m in (sb_admin.table("materials").select("id").eq("class_id", str(class_id)).execute().data or [])]
        materials_progress = sb_admin.table("materials_progress").select("user_id, material_id, status").in_("user_id", list(student_id_map.keys())).in_("material_id", materials_in_class_ids).execute().data or []
        # Get all quiz IDs and their weights for the class
        class_quizzes_res = sb_admin.table("quizzes").select("id, weight").eq("class_id", str(class_id)).execute().data or []
        class_quiz_weights = {q['id']: q['weight'] for q in class_quizzes_res}
        class_quiz_ids = list(class_quiz_weights.keys())
        
        quiz_results = sb_admin.table("results").select("user_id, quiz_id, score, total, created_at").in_("user_id", list(student_id_map.keys())).in_("quiz_id", class_quiz_ids).execute().data or []

        student_details = []
        for student_id, profile in student_id_map.items():
            mats_completed = len([p for p in materials_progress if p['user_id'] == student_id and p['status'] == 'completed'])
            
            student_quiz_results = [r for r in quiz_results if r['user_id'] == student_id]
            
            # Get the highest score for each quiz for the current student
            highest_scores_for_student = {}
            for result in student_quiz_results:
                quiz_id = result['quiz_id']
                score = result['score']
                if quiz_id not in highest_scores_for_student or (score is not None and highest_scores_for_student[quiz_id]['score'] is not None and score > highest_scores_for_student[quiz_id]['score']):
                    highest_scores_for_student[quiz_id] = result
            
            highest_student_results = list(highest_scores_for_student.values())
            
            quizzes_attempted = len(highest_student_results)
            
            # Calculate weighted average score
            weighted_sum_scores = 0
            total_weights = 0
            for result in highest_student_results:
                quiz_id_str = result['quiz_id']
                score = result['score']
                total = result.get('total')
                weight = class_quiz_weights.get(quiz_id_str, 0)

                if score is not None and total is not None and total > 0:
                    score_percentage = (score / total) * 100
                    weighted_sum_scores += score_percentage * weight
                    total_weights += weight

            average_score = 0.0
            if total_weights > 0:
                average_score = weighted_sum_scores / total_weights

            student_details.append(StudentProgressDetail(
                user_id=student_id,
                username=profile['username'],
                email=profile['email'],
                materials_completed=mats_completed,
                quizzes_attempted=quizzes_attempted,
                average_score=round(average_score, 2) # Assign the calculated final score
            ))

        return StudentProgressDetailsResponse(total_materials=total_materials, student_details=student_details)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
