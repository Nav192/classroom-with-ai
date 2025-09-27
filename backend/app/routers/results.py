from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_student_user, get_current_teacher_user, verify_class_membership
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

class CheatingLogOut(BaseModel):
    id: UUID
    user_id: UUID
    quiz_id: UUID
    result_id: Optional[UUID]
    event_type: str
    timestamp: datetime
    details: Optional[str]
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
    cheating_logs: List[CheatingLogOut] = [] # Added for cheating detection
    class Config:
        from_attributes = True

class GradeEssayRequest(BaseModel):
    is_correct: bool

class CheatingLogRequest(BaseModel):
    quiz_id: UUID
    event_type: str
    details: Optional[str] = None
    result_id: Optional[UUID] = None

# --- Endpoints ---

@router.post("/submit", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
async def submit_quiz(
    payload: SubmitQuizRequest,
    sb_admin: Client = Depends(get_supabase_admin),
    current_student: dict = Depends(get_current_student_user),
):
    """Submits a quiz, auto-grades, and saves the result and individual answers."""
    student_id = current_student.get("id")

    # 1. Verify quiz exists, get its class, and check for student membership
    quiz_res = sb_admin.table("quizzes").select("class_id, type, max_attempts").eq("id", payload.quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    
    quiz_class_id = quiz_res.data['class_id']
    quiz_type = quiz_res.data['type']
    max_attempts = quiz_res.data['max_attempts']

    member_res = sb_admin.table("class_members").select("id").eq("class_id", quiz_class_id).eq("user_id", student_id).single().execute()
    if not member_res.data:
        raise HTTPException(status_code=403, detail="You are not enrolled in the class for this quiz.")

    # 2. Check attempt limits
    previous_attempts_res = sb_admin.table("results").select("attempt_number").eq("quiz_id", payload.quiz_id).eq("user_id", student_id).order("attempt_number", desc=True).limit(1).execute()
    current_attempt_number = 1
    if previous_attempts_res.data:
        last_attempt = previous_attempts_res.data[0]['attempt_number']
        current_attempt_number = last_attempt + 1
        if current_attempt_number > max_attempts:
            raise HTTPException(status_code=403, detail=f"Maximum attempt limit ({max_attempts}) for this quiz has been reached.")

    # 3. Fetch all questions for grading
    questions_res = sb_admin.table("questions").select("id, type, answer").eq("quiz_id", payload.quiz_id).execute()
    quiz_questions = {str(q['id']): q for q in questions_res.data}

    score = 0
    total_questions = len(quiz_questions)
    answers_to_insert = []

    for submitted_answer in payload.answers:
        question_data = quiz_questions.get(str(submitted_answer.question_id))
        if not question_data:
            continue

        is_correct = None
        if question_data['type'] in ['mcq', 'true_false']:
            is_correct = str(question_data['answer']).strip().lower() == str(submitted_answer.response).strip().lower()
            if is_correct:
                score += 1

        answers_to_insert.append({
            "result_id": None, 
            "question_id": str(submitted_answer.question_id),
            "user_id": str(student_id),
            "answer": submitted_answer.response,
            "is_correct": is_correct,
        })

    # 4. Insert the main result record
    try:
        result_insert_res = sb_admin.table("results").insert({
            "quiz_id": str(payload.quiz_id),
            "user_id": str(student_id),
            "score": score,
            "total": total_questions,
            "attempt_number": current_attempt_number,
            "started_at": payload.started_at.isoformat(),
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        if not result_insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to save quiz result: No data returned from insert.")
        
        new_result = result_insert_res.data[0]

    except Exception as e:
        print(f"Error inserting result into database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save quiz result: {str(e)}")
    result_id = new_result['id']

    # 5. Update individual answers with the new result_id and insert them
    for answer_data in answers_to_insert:
        answer_data['result_id'] = str(result_id)
    
    if answers_to_insert:
        sb_admin.table("quiz_answers").insert(answers_to_insert).execute()
    else:
        print("No answers to insert for quiz result.")

    # 6. Delete checkpoints for this quiz and student
    try:
        sb_admin.table("quiz_checkpoints").delete()\
            .eq("user_id", str(student_id))\
            .eq("quiz_id", str(payload.quiz_id))\
            .eq("attempt_number", current_attempt_number)\
            .execute()
        print(f"DEBUG: Checkpoints cleared for user {student_id}, quiz {payload.quiz_id}, attempt {current_attempt_number}")
    except Exception as e:
        print(f"WARNING: Failed to clear checkpoints for user {student_id}, quiz {payload.quiz_id}, attempt {current_attempt_number}: {e}")
        # Do not raise HTTPException, as checkpoint clearing is secondary to quiz submission

    return new_result


@router.get("/history", response_model=List[ResultOut])
def get_quiz_history(
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """(For Students) Gets the quiz history for the current user."""
    user_id = current_user.get("id")
    
    response = sb.table("results").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return response.data or []

@router.get("/history/{result_id}", response_model=ResultOut)
def get_single_result(
    result_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """(For Students) Gets a single quiz result by ID for the current user."""
    user_id = current_user.get("id")
    
    response = sb.table("results").select("*").eq("id", result_id).eq("user_id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Result not found or you do not have permission.")
    return response.data

@router.get("/history/{result_id}/answers", response_model=List[QuizAnswerOut])
def get_result_answers(
    result_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """(For Students) Gets the individual answers for a specific result for the current user."""
    user_id = current_user.get("id")
    
    result_check = sb.table("results").select("id").eq("id", result_id).eq("user_id", user_id).single().execute()
    if not result_check.data:
        raise HTTPException(status_code=404, detail="Result not found or you do not have permission.")

    response = sb.table("quiz_answers").select("*").eq("result_id", result_id).order("created_at", asc=True).execute()
    return response.data or []

# --- Teacher Endpoints ---

@router.get("/class/{class_id}/quiz/{quiz_id}", response_model=List[ResultOut], dependencies=[Depends(verify_class_membership)])
def get_results_for_quiz_in_class(
    class_id: UUID, # Verified by dependency
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get all results for a specific quiz in a class."""
    quiz_check = sb.table("quizzes").select("id").eq("id", str(quiz_id)).eq("class_id", str(class_id)).single().execute()
    if not quiz_check.data:
        raise HTTPException(status_code=404, detail="Quiz not found in this class.")

    results_data = sb.table("results").select("*").eq("quiz_id", str(quiz_id)).order("created_at", desc=True).execute().data or []
    
    # Fetch cheating logs for each result
    for result in results_data:
        cheating_logs_res = sb.table("cheating_logs").select("*").eq("result_id", result['id']).order("timestamp", desc=True).execute()
        result['cheating_logs'] = cheating_logs_res.data or []

    return results_data

@router.get("/class/{class_id}/student/{student_id}", response_model=List[ResultOut], dependencies=[Depends(verify_class_membership)])
def get_results_for_student_in_class(
    class_id: UUID, # Verified by dependency
    student_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Get all quiz results for a specific student within a specific class."""
    student_member_res = sb.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", str(student_id)).single().execute()
    if not student_member_res.data:
        raise HTTPException(status_code=404, detail="Student is not a member of this class.")

    class_quizzes_res = sb.table("quizzes").select("id").eq("class_id", str(class_id)).execute()
    class_quiz_ids = [q['id'] for q in class_quizzes_res.data]

    if not class_quiz_ids:
        return []

    results = sb.table("results").select("*").eq("user_id", str(student_id)).in_("quiz_id", class_quiz_ids).order("created_at", desc=True).execute()
    return results.data or []

@router.patch("/grade-essay/{answer_id}", response_model=ResultOut, summary="Grade an essay answer")
def grade_essay_answer(
    answer_id: UUID,
    payload: GradeEssayRequest,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """(For Teachers) Manually grade an essay answer and update the total quiz score."""
    try:
        # 1. Fetch the answer and its result_id
        answer_res = sb.table("quiz_answers").select("id, result_id, is_correct").eq("id", str(answer_id)).single().execute()
        if not answer_res.data:
            raise HTTPException(status_code=404, detail="Answer not found.")
        if answer_res.data['is_correct'] is not None:
            raise HTTPException(status_code=400, detail="This answer has already been graded.")
        
        result_id = answer_res.data['result_id']

        # 2. Authorization: Verify the teacher is a member of the quiz's class
        result_res = sb.table("results").select("quiz_id").eq("id", result_id).single().execute()
        quiz_id = result_res.data['quiz_id']
        quiz_res = sb.table("quizzes").select("class_id").eq("id", quiz_id).single().execute()
        class_id = quiz_res.data['class_id']

        verify_class_membership(class_id=UUID(class_id), user=current_teacher, db=sb) # Manual dependency call

        # 3. Update the answer's grade
        sb.table("quiz_answers").update({"is_correct": payload.is_correct}).eq("id", str(answer_id)).execute()

        # 4. Recalculate the total score for the result
        # Get all questions for the quiz to categorize them by type
        questions_res = sb.table("questions").select("id, type").eq("quiz_id", quiz_id).execute().data or []
        question_types = {str(q['id']): q['type'] for q in questions_res}

        # Get all answers for this result to recalculate the entire score
        all_answers_for_result = sb.table("quiz_answers").select("question_id, is_correct").eq("result_id", result_id).execute().data or []

        # Fetch quiz weights
        weights_res = sb.table("quiz_weights").select("*").eq("class_id", class_id).single().execute()
        weights = weights_res.data if weights_res.data else {"mcq_weight": 1, "true_false_weight": 1, "essay_weight": 1} # Default weights

        mcq_correct, tf_correct, essay_correct = 0, 0, 0
        mcq_total, tf_total, essay_total = 0, 0, 0

        for q_id, q_type in question_types.items():
            if q_type == 'mcq':
                mcq_total += 1
            elif q_type == 'true_false':
                tf_total += 1
            elif q_type == 'essay':
                essay_total += 1

        for ans in all_answers_for_result:
            q_type = question_types.get(str(ans['question_id']))
            if ans['is_correct']:
                if q_type == 'mcq':
                    mcq_correct += 1
                elif q_type == 'true_false':
                    tf_correct += 1
                elif q_type == 'essay':
                    essay_correct += 1
        
        # Recalculate weighted score
        total_weight = weights['mcq_weight'] + weights['true_false_weight'] + weights['essay_weight']
        new_score = 0
        if total_weight > 0:
            mcq_percentage = (mcq_correct / mcq_total) * 100 if mcq_total > 0 else 0
            tf_percentage = (tf_correct / tf_total) * 100 if tf_total > 0 else 0
            essay_percentage = (essay_correct / essay_total) * 100 if essay_total > 0 else 0
            
            mcq_weighted_score = mcq_percentage * (weights['mcq_weight'] / total_weight)
            tf_weighted_score = tf_percentage * (weights['true_false_weight'] / total_weight)
            essay_weighted_score = essay_percentage * (weights['essay_weight'] / total_weight)
            
            new_score = round(mcq_weighted_score + tf_weighted_score + essay_weighted_score)

        # 5. Update the main result score
        updated_result = sb.table("results").update({"score": new_score}).eq("id", result_id).select("*").single().execute()

        return updated_result.data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/cheating-log", status_code=status.HTTP_204_NO_CONTENT)
def log_cheating_event(
    payload: CheatingLogRequest,
    sb: Client = Depends(get_supabase_admin),
    current_user: dict = Depends(get_current_user),
):
    """Logs a potential cheating event."""
    try:
        sb.table("cheating_logs").insert({
            "user_id": current_user.get("id"),
            "quiz_id": str(payload.quiz_id),
            "result_id": str(payload.result_id) if payload.result_id else None,
            "event_type": payload.event_type,
            "details": payload.details
        }).execute()
    except Exception as e:
        # Log the error but don't fail the request, as cheating logs are secondary
        print(f"Failed to log cheating event: {e}")
