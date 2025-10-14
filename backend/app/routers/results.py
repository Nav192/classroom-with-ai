from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_student_user, get_current_teacher_user, verify_class_membership
from supabase import Client

async def _finalize_quiz_result_score(quiz_result_id: UUID, sb: Client):
    # 1. Fetch the quiz result to get quiz_id and user_id
    result_res = sb.table("results").select("quiz_id, user_id").eq("id", str(quiz_result_id)).single().execute()
    if not result_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz result not found for finalization.")
    result_data = result_res.data
    quiz_id = result_data['quiz_id']
    user_id = result_data['user_id']

    # 2. Fetch all questions for the quiz
    questions_res = sb.table("questions").select("id, type, max_score").eq("quiz_id", quiz_id).execute()
    if not questions_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questions for quiz not found during finalization.")
    quiz_questions_map = {str(q['id']): q for q in questions_res.data}
    print(f"DEBUG: quiz_questions_map in finalize: {quiz_questions_map}") # NEW DEBUG PRINT

    calculated_score = 0
    total_possible_score = 0

    # 3. Process non-essay answers
    quiz_answers_res = sb.table("quiz_answers").select("question_id, is_correct").eq("result_id", str(quiz_result_id)).execute()
    for answer in quiz_answers_res.data:
        question_id = str(answer['question_id'])
        question_data = quiz_questions_map.get(question_id)
        print(f"DEBUG: Processing answer for question_id: {question_id}, question_data: {question_data}") # NEW DEBUG PRINT
        if question_data and question_data['type'] in ['mcq', 'true_false']:
            question_max_score = question_data.get('max_score', 1) # Get max_score for MCQ/TrueFalse, default to 1
            print(f"DEBUG: Question {question_id} (Type: {question_data['type']}) - max_score used: {question_max_score}") # NEW DEBUG PRINT
            total_possible_score += question_max_score
            if answer['is_correct']:
                calculated_score += question_max_score

    # 4. Process essay submissions
    essay_submissions_res = sb.table("essay_submissions").select("quiz_question_id, teacher_score").eq("quiz_result_id", str(quiz_result_id)).execute()
    for submission in essay_submissions_res.data:
        question_id = str(submission['quiz_question_id'])
        question_data = quiz_questions_map.get(question_id)
        if question_data and question_data['type'] == 'essay':
            total_possible_score += question_data.get('max_score', 0) # Add max_score for essay
            if submission['teacher_score'] is not None:
                calculated_score += submission['teacher_score']

    # 5. Update the results table with the final score and status
    update_data = {
        "score": calculated_score,
        "total": total_possible_score, # Update total based on all questions
        "status": "graded",
        "ended_at": datetime.now(timezone.utc).isoformat() # Ensure ended_at is set if not already
    }
    update_res = sb.table("results").update(update_data).eq("id", str(quiz_result_id)).execute()
    if not update_res.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update quiz result with final score.")


router = APIRouter()

# --- Pydantic Models ---
class AnswerSubmit(BaseModel):
    question_id: UUID
    response: str

class SubmitQuizRequest(BaseModel):
    result_id: UUID
    user_answers: dict # {question_id: answer_text}

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
    score: Optional[int] # Score can be null if pending review
    total: Optional[int] = None
    attempt_number: int
    started_at: datetime
    ended_at: Optional[datetime]
    created_at: datetime
    status: str
    cheating_logs: List[CheatingLogOut] = []
    username: Optional[str] = None
    teacher_feedback: Optional[str] = None # Overall feedback for the quiz
    class Config:
        from_attributes = True

class EssaySubmissionOut(BaseModel):
    id: UUID
    quiz_result_id: UUID
    quiz_question_id: UUID
    student_answer: str
    teacher_score: Optional[int] = None
    teacher_feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    question_text: Optional[str] = None # Renamed from text
    max_score: Optional[int] = None
    class Config:
        from_attributes = True

class EssayGradeIn(BaseModel):
    teacher_score: int
    teacher_feedback: Optional[str] = None

class CheatingLogRequest(BaseModel):
    quiz_id: UUID
    event_type: str
    details: Optional[str] = None
    result_id: Optional[UUID] = None

class QuizAverageScoreResponse(BaseModel):
    quiz_id: UUID
    average_score: Optional[float] = None
    total_attempts: int

class LatestQuizScoreResponse(BaseModel):
    quiz_id: UUID
    latest_score: Optional[int] = None
    latest_attempt_number: Optional[int] = None
    latest_submission_time: Optional[datetime] = None

class QuestionDetailOut(BaseModel):
    id: UUID
    question_text: str # Changed from text to question_text
    options: Optional[List[str]]
    question_type: str
    max_score: Optional[int] = None # For essay questions

class ResultAnswerDetailOut(BaseModel):
    question: QuestionDetailOut
    submitted_answer: Optional[str]
    correct_answer: Optional[str]
    is_correct: Optional[bool]
    teacher_score: Optional[int] = None # For essay questions
    teacher_feedback: Optional[str] = None # For essay questions

class TeacherResultAnswerDetailOut(ResultAnswerDetailOut):
    difficulty_level: Optional[str] = None

class QuizResultDetailOut(BaseModel):
    quiz_id: UUID
    class_id: UUID
    quiz_title: str
    result_id: UUID
    user_id: UUID
    score: int
    total_questions: int
    submitted_at: datetime
    max_attempts: Optional[int] = None
    attempts_taken: Optional[int] = None
    available_until: Optional[datetime] = None
    details: List[ResultAnswerDetailOut]

class TeacherQuizResultDetailOut(BaseModel):
    quiz_id: UUID
    class_id: UUID
    quiz_title: str
    result_id: UUID
    user_id: UUID
    score: int
    total_questions: int
    submitted_at: datetime
    max_attempts: Optional[int] = None
    attempts_taken: Optional[int] = None
    details: List[TeacherResultAnswerDetailOut]

# --- Endpoints ---

@router.get("/{result_id}/details")
def get_quiz_result_details(
    result_id: UUID,
    current_user: dict = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """
    Fetches the detailed results of a specific quiz submission, including
    each question, the user's answer, the correct answer, and correctness.
    Accessible by the student who took the quiz or a teacher of the class.
    """
    print(f"DEBUG: get_quiz_result_details called for result_id: {result_id}")
    # 1. Fetch the primary result record
    result_res = sb.table("results").select("quiz_id, user_id, score, total, created_at, status, teacher_feedback").eq("id", str(result_id)).single().execute()
    if not result_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz result not found.")
    
    result_data = result_res.data
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    print(f"DEBUG: Current user role: {user_role}")

    # 2. Fetch quiz details for max_attempts and authorization
    quiz_res = sb.table("quizzes").select("id, topic, user_id, class_id, max_attempts, available_until").eq("id", result_data['quiz_id']).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated quiz not found.")
    
    quiz_data = quiz_res.data
    max_attempts = quiz_data.get('max_attempts')

    # Fetch all questions for the quiz early
    questions_res = sb.table("questions").select("id, text, options, type, answer, max_score").eq("quiz_id", quiz_data['id']).execute()
    if not questions_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questions for this quiz could not be found.")
    
    quiz_questions_map = {str(q['id']): q for q in questions_res.data}

    # 3. Count attempts taken by the user for this quiz
    attempts_taken_res = sb.table("results").select("id", count="exact").eq("quiz_id", quiz_data['id']).eq("user_id", result_data['user_id']).execute()
    attempts_taken = attempts_taken_res.count

    # 4. Authorization Check
    is_student_owner = str(result_data['user_id']) == str(user_id)

    if user_role == 'student':
        if not is_student_owner:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view these results.")
    elif user_role == 'teacher' or user_role == 'admin':
        # Teachers/Admins must be members or creators of the class associated with the quiz
        try:
            verify_class_membership(class_id=quiz_data['class_id'], user=current_user, sb_admin=sb)
        except HTTPException as e:
            if e.status_code == status.HTTP_404_NOT_FOUND: # Class not found for quiz
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view these results.")
            raise e
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view these results.")

    # 5. Fetch all questions and submitted answers for the quiz
    questions_res = sb.table("questions").select("id, text, options, type, answer, max_score").eq("quiz_id", quiz_data['id']).execute()
    if not questions_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questions for this quiz could not be found.")
    
    submitted_answers_res = sb.table("quiz_answers").select("*").eq("result_id", str(result_id)).execute()
    essay_submissions_res = sb.table("essay_submissions").select("*").eq("quiz_result_id", str(result_id)).execute()
    
    # Map submitted answers by question_id for easy lookup
    submitted_answers_map = {str(ans['question_id']): ans for ans in submitted_answers_res.data}
    essay_submissions_map = {str(sub['quiz_question_id']): sub for sub in essay_submissions_res.data}

    # Initialize detailed_results list
    detailed_results = []

    # If user is teacher/admin, calculate difficulty levels
    if user_role == 'teacher' or user_role == 'admin':
        print(f"DEBUG: Entered teacher/admin difficulty calculation block.")
        print(f"DEBUG: Starting difficulty calculation process.") # NEW DEBUG PRINT
        print(f"DEBUG: Calculating difficulty levels for quiz_id: {quiz_data['id']}")
        # Identify the latest attempt for each student
        try:
            all_results_res = sb.table("results").select("id, user_id, created_at").eq("quiz_id", quiz_data['id']).order("created_at", desc=True).execute()
            all_results = all_results_res.data or []
            print(f"DEBUG: All results for quiz {quiz_data['id']}: {all_results}")
        except Exception as e:
            print(f"ERROR: Failed to fetch all results for difficulty calculation: {e}")
            all_results = [] # Ensure all_results is defined to avoid further errors

        try:
            latest_results = {} # {user_id: latest_result_object}
            for result in all_results:
                user_id = result['user_id']
                if user_id not in latest_results:
                    latest_results[user_id] = result
            
            latest_result_ids = [res['id'] for res in latest_results.values()]
            print(f"DEBUG: Latest result IDs for difficulty calculation: {latest_result_ids}")
        except Exception as e:
            print(f"ERROR: Failed to process latest results for difficulty calculation: {e}")
            latest_result_ids = [] # Ensure it's defined

        # Fetch answers only from these latest attempts
        all_quiz_answers = []
        try:
            if latest_result_ids:
                all_quiz_answers_res = sb.table("quiz_answers").select("question_id, is_correct").in_("result_id", latest_result_ids).execute()
                all_quiz_answers = all_quiz_answers_res.data or []
            print(f"DEBUG: All quiz answers from latest attempts: {all_quiz_answers}")
        except Exception as e:
            print(f"ERROR: Failed to fetch quiz answers from latest attempts: {e}")
            all_quiz_answers = [] # Ensure it's defined

        # Calculate stats based on the filtered answers
        question_stats = {}
        for ans in all_quiz_answers:
            q_id = str(ans['question_id'])
            if q_id not in question_stats:
                question_stats[q_id] = {'total_attempts': 0, 'correct_attempts': 0}
            
            # Get question type for this answer
            question_data_for_ans = quiz_questions_map.get(q_id)
            ans_question_type = question_data_for_ans.get('type') if question_data_for_ans else 'unknown'
            print(f"DEBUG: Processing answer for q_id: {q_id}, is_correct: {ans['is_correct']}, type: {ans_question_type}")

            if ans['is_correct'] is not None:
                question_stats[q_id]['total_attempts'] += 1
                if ans['is_correct']:
                    question_stats[q_id]['correct_attempts'] += 1
        
        for question in questions_res.data:
            question_id_str = str(question['id'])
            submitted = submitted_answers_map.get(question_id_str)
            essay_sub = essay_submissions_map.get(question_id_str)
            stats = question_stats.get(question_id_str, {'total_attempts': 0, 'correct_attempts': 0})

            difficulty_level = None
            if stats['total_attempts'] > 0:
                correct_percentage = (stats['correct_attempts'] / stats['total_attempts']) * 100
                if correct_percentage < 50:
                    difficulty_level = 'Hard'
                elif correct_percentage == 50:
                    difficulty_level = 'Medium'
                else: # > 50%
                    difficulty_level = 'Easy'

            detailed_results.append(
                TeacherResultAnswerDetailOut(
                    question=QuestionDetailOut(
                        id=question['id'],
                        question_text=question['text'],
                        options=question.get('options'),
                        question_type=question['type'],
                        max_score=question.get('max_score')
                    ),
                    submitted_answer=submitted['answer'] if submitted else (essay_sub['student_answer'] if essay_sub else None),
                    correct_answer=question.get('answer'),
                    is_correct=submitted['is_correct'] if submitted else None,
                    difficulty_level=difficulty_level,
                    teacher_score=essay_sub['teacher_score'] if essay_sub else None,
                    teacher_feedback=essay_sub['teacher_feedback'] if essay_sub else None
                )
            )
        
        return TeacherQuizResultDetailOut(
            quiz_id=quiz_data['id'],
            class_id=quiz_data['class_id'],
            quiz_title=quiz_data['topic'],
            result_id=result_id,
            user_id=result_data['user_id'],
            score=result_data['score'],
            total_questions=result_data['total'],
            submitted_at=result_data['created_at'],
            max_attempts=max_attempts,
            attempts_taken=attempts_taken,
            details=detailed_results,
        )

    else: # User is a student
        for question in questions_res.data:
            question_id_str = str(question['id'])
            submitted = submitted_answers_map.get(question_id_str)
            essay_sub = essay_submissions_map.get(question_id_str)

            detailed_results.append(
                ResultAnswerDetailOut(
                    question=QuestionDetailOut(
                        id=question['id'],
                        question_text=question['text'], # Changed from question_text to text
                        options=question.get('options'),
                        question_type=question['type'],
                        max_score=question.get('max_score')
                    ),
                    submitted_answer=submitted['answer'] if submitted else (essay_sub['student_answer'] if essay_sub else None),
                    correct_answer=question.get('answer'),
                    is_correct=submitted['is_correct'] if submitted else None,
                    teacher_score=essay_sub['teacher_score'] if essay_sub else None,
                    teacher_feedback=essay_sub['teacher_feedback'] if essay_sub else None
                )
            )
        
        return QuizResultDetailOut(
            quiz_id=quiz_data['id'],
            class_id=quiz_data['class_id'],
            quiz_title=quiz_data['topic'],
            result_id=result_id,
            user_id=result_data['user_id'],
            score=result_data['score'],
            total_questions=result_data['total'],
            submitted_at=result_data['created_at'],
            max_attempts=max_attempts,
            attempts_taken=attempts_taken,
            available_until=quiz_data.get('available_until'),
            details=detailed_results,
        )


@router.post("/submit", response_model=ResultOut, status_code=status.HTTP_201_CREATED)
async def submit_quiz(
    payload: SubmitQuizRequest,
    sb_admin: Client = Depends(get_supabase_admin),
    current_student: dict = Depends(get_current_student_user),
):
    """Submits a quiz, auto-grades, and saves the result and individual answers."""
    print(f"DEBUG: submit_quiz called with result_id: {payload.result_id}")
    print(f"DEBUG: payload.user_answers: {payload.user_answers}")

    student_id = current_student.get("id")

    # 1. Verify the result entry and that it belongs to the user and is not yet ended
    result_res = sb_admin.table("results").select("id, quiz_id, user_id, started_at, ended_at, attempt_number")\
        .eq("id", str(payload.result_id))\
        .eq("user_id", student_id)\
        .single()\
        .execute()

    if not result_res.data:
        raise HTTPException(status_code=404, detail="Quiz attempt not found or does not belong to user.")
    
    result_data = result_res.data
    if result_data.get("ended_at"):
        raise HTTPException(status_code=400, detail="Quiz has already been submitted.")

    quiz_id = UUID(result_data["quiz_id"])
    started_at = datetime.fromisoformat(result_data["started_at"])
    attempt_number = result_data["attempt_number"]

    # 2. Fetch quiz details for questions and max_attempts
    quiz_res = sb_admin.table("quizzes").select("id, type, max_attempts").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Associated quiz not found.")
    
    quiz_type = quiz_res.data["type"]
    max_attempts = quiz_res.data["max_attempts"]

    # 3. Fetch all questions for grading
    questions_res = sb_admin.table("questions").select("id, type, answer, max_score").eq("quiz_id", str(quiz_id)).execute()
    if not questions_res.data:
        raise HTTPException(status_code=404, detail="Questions for this quiz not found.")
    
    quiz_questions = {str(q['id']): q for q in questions_res.data}

    score = 0
    total_possible_score = 0 # Renamed from total_questions

    answers_to_insert = []
    essay_submissions_to_insert = []
    has_essays = False

    print(f"DEBUG: User answers received: {payload.user_answers}")
    for question_id_str, user_answer in payload.user_answers.items():
        question_data = quiz_questions.get(question_id_str)
        if not question_data:
            print(f"DEBUG: Question data not found for {question_id_str}. Skipping.")
            continue

        question_type = question_data.get('type')
        print(f"DEBUG: Processing question {question_id_str}, type: {question_type}, answer: {user_answer}")
        
        if question_type == 'essay':
            has_essays = True
            essay_submission_entry = {
                "quiz_result_id": str(payload.result_id),
                "quiz_question_id": question_id_str,
                "student_answer": user_answer,
            }
            print(f"DEBUG: Appending essay submission entry: {essay_submission_entry}")
            essay_submissions_to_insert.append(essay_submission_entry)
            total_possible_score += question_data.get('max_score', 0) # Add max_score for essay
        elif question_type in ['mcq', 'true_false']:
            question_max_score = question_data.get('max_score')
            if question_max_score is None:
                question_max_score = 1 # Default to 1 if max_score is None in DB
            
            total_possible_score += question_max_score
            is_correct = str(question_data.get('answer', '')).strip().lower() == str(user_answer).strip().lower()
            if is_correct:
                score += question_max_score # Add question_max_score if correct
            
            answers_to_insert.append({
                "result_id": str(payload.result_id),
                "question_id": question_id_str,
                "user_id": student_id,
                "answer": user_answer,
                "is_correct": is_correct,
            })
    print(f"DEBUG: Final essay_submissions_to_insert before DB call: {essay_submissions_to_insert}")
    
    # 4. Update the main result record

    print(f"DEBUG: Final calculated score: {score}") # NEW DEBUG PRINT
    print(f"DEBUG: Final total possible score: {total_possible_score}") # NEW DEBUG PRINT
    # 4. Update the main result record
    try:
        now = datetime.now(timezone.utc)
        update_data = {
            "score": score,
            "total": total_possible_score, # Use total_possible_score here
            "ended_at": now.isoformat(),
            "status": "pending_review" if has_essays else "completed",
        }
        result_update_res = sb_admin.table("results").update(update_data).eq("id", str(payload.result_id)).execute()

        if not result_update_res.data:
            raise HTTPException(status_code=500, detail="Failed to update quiz result: No data returned from update.")
        
        updated_result = result_update_res.data[0]

    except Exception as e:
        print(f"Error updating result into database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update quiz result: {str(e)}")
    
    # 5. Insert individual answers and essay submissions
    if answers_to_insert:
        print(f"DEBUG: Attempting to insert quiz answers: {answers_to_insert}") # NEW DEBUG PRINT
        try:
            insert_res = sb_admin.table("quiz_answers").insert(answers_to_insert).execute()
            print(f"DEBUG: Quiz answers insert response: {insert_res.data}") # NEW DEBUG PRINT
        except Exception as e:
            print(f"ERROR: Failed to insert quiz answers: {e}") # NEW DEBUG PRINT
    
    if essay_submissions_to_insert:
        print(f"DEBUG: Attempting to insert essay submissions: {essay_submissions_to_insert}")
        try:
            insert_res = sb_admin.table("essay_submissions").insert(essay_submissions_to_insert).execute()
            print(f"DEBUG: Essay submissions insert response: {insert_res.data}")
        except Exception as e:
            print(f"ERROR: Failed to insert essay submissions: {e}")

    # 6. Delete checkpoints for this quiz and student
    try:
        sb_admin.table("quiz_checkpoints").delete()\
            .eq("user_id", str(student_id))\
            .eq("quiz_id", str(quiz_id))\
            .eq("attempt_number", attempt_number)\
            .execute()
        print(f"DEBUG: Checkpoints cleared for user {student_id}, quiz {quiz_id}, attempt {attempt_number}")
    except Exception as e:
        print(f"WARNING: Failed to clear checkpoints for user {student_id}, quiz {quiz_id}, attempt {attempt_number}: {e}")
        # Do not raise HTTPException, as checkpoint clearing is secondary to quiz submission

    return updated_result


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
    """(For Teachers) Get all results for a specific quiz in a class, including student info."""
    quiz_check = sb.table("quizzes").select("id, topic, available_until").eq("id", str(quiz_id)).eq("class_id", str(class_id)).single().execute()
    if not quiz_check.data:
        raise HTTPException(status_code=404, detail="Quiz not found in this class.")
    
    quiz_available_until = None
    if quiz_check.data.get("available_until"):
        quiz_available_until = datetime.fromisoformat(quiz_check.data["available_until"])

    results_res = sb.table("results").select("*").eq("quiz_id", str(quiz_id)).order("created_at", desc=True).execute()
    results_data = results_res.data or []
    
    if not results_data:
        return []

    now = datetime.now(timezone.utc)
    updated_results_data = []
    for result in results_data:
        current_status = result['status']
        if current_status == "pending_review" and quiz_available_until and now > quiz_available_until:
            # Update status to 'completed' if deadline passed and still pending review
            update_data = {
                "status": "completed",
                "ended_at": result['ended_at'] or now.isoformat() # Ensure ended_at is set
            }
            try:
                sb.table("results").update(update_data).eq("id", result['id']).execute()
                result.update(update_data) # Update local result object for immediate response
            except Exception as e:
                print(f"WARNING: Failed to update result {result['id']} status to completed after deadline: {e}")
        updated_results_data.append(result)

    # Get user IDs from results
    user_ids = [res['user_id'] for res in updated_results_data]
    
    # Fetch user details from profiles table which has appropriate RLS
    users_res = sb.table("profiles").select("id, username").in_("id", user_ids).execute()
    users_map = {str(user['id']): user for user in (users_res.data or [])}

    # Combine data
    response_data = []
    for result in updated_results_data:
        user_info = users_map.get(str(result['user_id']))
        username = 'Unknown User'
        if user_info:
            username = user_info.get('username') or 'Unknown User'
        
        # Fetch cheating logs for each result
        cheating_logs_res = sb.table("cheating_logs").select("*").eq("result_id", result['id']).order("timestamp", desc=True).execute()
        cheating_logs = cheating_logs_res.data or []

        response_data.append(
            ResultOut(
                id=result['id'],
                quiz_id=result['quiz_id'],
                user_id=result['user_id'],
                score=result['score'],
                total=result['total'],
                attempt_number=result['attempt_number'],
                started_at=result['started_at'],
                ended_at=result['ended_at'],
                created_at=result['created_at'],
                cheating_logs=cheating_logs,
                username=username,
                status=result['status'],
            )
        )

    return response_data

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

@router.put("/essay-submissions/{essay_submission_id}/grade", response_model=EssaySubmissionOut)
async def grade_essay_submission(
    essay_submission_id: UUID,
    payload: EssayGradeIn,
    sb: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """ (For Teachers) Grades an individual essay submission. """
    # 1. Fetch the essay submission and associated quiz result/question
    submission_res = sb.table("essay_submissions").select("*, quiz_result_id, questions(max_score)").eq("id", str(essay_submission_id)).single().execute()
    if not submission_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Essay submission not found.")
    
    submission_data = submission_res.data
    quiz_result_id = submission_data['quiz_result_id']
    max_score = submission_data['questions']['max_score']

    if payload.teacher_score is not None and (payload.teacher_score < 0 or payload.teacher_score > max_score):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Score must be between 0 and {max_score}.")

    # 2. Verify teacher has access to the quiz result's class
    result_res = sb.table("results").select("quiz_id").eq("id", str(quiz_result_id)).single().execute()
    if not result_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated quiz result not found.")
    quiz_id = result_res.data['quiz_id']

    quiz_res = sb.table("quizzes").select("class_id").eq("id", quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated quiz not found.")
    class_id = quiz_res.data['class_id']

    verify_class_membership(class_id=UUID(class_id), user=current_teacher, sb_admin=sb)

    # 3. Update the essay submission
    update_data = {
        "teacher_score": payload.teacher_score,
        "teacher_feedback": payload.teacher_feedback,
        "graded_at": datetime.now(timezone.utc).isoformat()
    }
    updated_submission_res = sb.table("essay_submissions").update(update_data).eq("id", str(essay_submission_id)).execute()
    if not updated_submission_res.data:
        raise HTTPException(status_code=500, detail="Failed to update essay submission.")
    
    updated_submission = updated_submission_res.data[0]

    # 4. Check if all essays for this quiz result are graded
    all_essays_for_result_res = sb.table("essay_submissions").select("id, teacher_score").eq("quiz_result_id", str(quiz_result_id)).execute()
    all_essays = all_essays_for_result_res.data or []

    all_graded = all(essay['teacher_score'] is not None for essay in all_essays)

    if all_graded:
        # All essays are graded, finalize the quiz result score and status
        await _finalize_quiz_result_score(quiz_result_id, sb)

    # Re-fetch the updated submission with question details for response
    re_fetched_submission_res = sb.table("essay_submissions").select("*, questions(text, max_score)").eq("id", str(essay_submission_id)).single().execute()
    if not re_fetched_submission_res.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to re-fetch updated essay submission.")
    re_fetched_submission = re_fetched_submission_res.data
    question_data = re_fetched_submission.pop('questions')
    return EssaySubmissionOut(
        **re_fetched_submission,
        question_text=question_data.get("text"),
        max_score=question_data.get("max_score")
    )


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


@router.post("/{quiz_result_id}/finalize-grading", status_code=status.HTTP_200_OK)
async def finalize_quiz_grading(
    quiz_result_id: UUID,
    sb: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """ (For Teachers) Finalizes the grading of a quiz result, recalculating the overall score. """
    # Verify teacher has access to the quiz result's class
    result_res = sb.table("results").select("quiz_id").eq("id", str(quiz_result_id)).single().execute()
    if not result_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz result not found.")
    quiz_id = result_res.data['quiz_id']

    quiz_res = sb.table("quizzes").select("class_id").eq("id", quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated quiz not found.")
    class_id = quiz_res.data['class_id']

    verify_class_membership(class_id=UUID(class_id), user=current_teacher, sb_admin=sb)

    await _finalize_quiz_result_score(quiz_result_id, sb)

    return {"message": "Quiz grading finalized successfully."}

class QuizAverageScoreResponse(BaseModel):
    quiz_id: UUID
    average_score: Optional[float] = None
    total_attempts: int

@router.get("/my/quiz/{quiz_id}/average_score", response_model=QuizAverageScoreResponse)
async def get_my_quiz_average_score(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id")

    # Fetch all scores for the given quiz and user
    results = sb.table("results").select("score").eq("quiz_id", str(quiz_id)).eq("user_id", user_id).execute().data

    if not results:
        return QuizAverageScoreResponse(quiz_id=quiz_id, average_score=None, total_attempts=0)

    # Filter out None scores and calculate average
    valid_scores = [r["score"] for r in results if r["score"] is not None]

    average_score = sum(valid_scores) / len(valid_scores) if valid_scores else None
    total_attempts = len(results)

    return QuizAverageScoreResponse(
        quiz_id=quiz_id,
        average_score=round(average_score, 2) if average_score is not None else None,
        total_attempts=total_attempts
    )

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

@router.get("/{result_id}/essay-submissions-with-questions", response_model=List[EssaySubmissionOut])
def get_essay_submissions_with_questions(
    result_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """ (For Teachers) Retrieves all essay submissions for a specific quiz result, with questions. """
    print(f"DEBUG: get_essay_submissions_with_questions called with result_id: {result_id}")
    # Verify teacher has access to the quiz result's class
    # Get quiz_id and user_id from the result_id
    result_res = sb.table("results").select("quiz_id, user_id").eq("id", str(result_id)).single().execute()
    if not result_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz result not found.")
    quiz_id = result_res.data['quiz_id']
    student_user_id = result_res.data['user_id']

    # Find the latest attempt for this student and quiz
    latest_attempt_res = sb.table("results").select("id") \
        .eq("quiz_id", quiz_id) \
        .eq("user_id", student_user_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .single() \
        .execute()

    if not latest_attempt_res.data or str(latest_attempt_res.data['id']) != str(result_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only the latest quiz attempt can be graded for essay questions."
        )

    quiz_res = sb.table("quizzes").select("class_id").eq("id", quiz_id).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated quiz not found.")
    class_id = quiz_res.data['class_id']

    verify_class_membership(class_id=UUID(class_id), user=current_teacher, sb_admin=sb)

    essay_submissions_res = sb.table("essay_submissions").select("*").eq("quiz_result_id", str(result_id)).execute()
    print(f"DEBUG: Essay submissions query result: {essay_submissions_res.data}")
    if not essay_submissions_res.data:
        return []
    
    question_ids = [sub['quiz_question_id'] for sub in essay_submissions_res.data]
    questions_res = sb.table("questions").select("id, text, max_score").in_("id", question_ids).execute()
    questions_map = {str(q['id']): q for q in questions_res.data}

    formatted_submissions = []
    for submission in essay_submissions_res.data:
        question_data = questions_map.get(str(submission['quiz_question_id']))
        if question_data:
            formatted_submissions.append(EssaySubmissionOut(
                **submission,
                question_text=question_data.get("text"),
                max_score=question_data.get("max_score")
            ))
    return formatted_submissions
