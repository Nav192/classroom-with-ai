from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import uuid
from uuid import UUID
from datetime import datetime, timezone

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_teacher_user, get_current_student_user, verify_class_membership, verify_quiz_membership
from supabase import Client

router = APIRouter()

# --- Pydantic Models ---
class QuestionIn(BaseModel):
    id: Optional[UUID] = None
    text: str
    type: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None

class QuizIn(BaseModel):
    topic: str
    type: str
    duration_minutes: int
    max_attempts: Optional[int] = 2
    questions: List[QuestionIn]
    visible_to: Optional[List[UUID]] = None
    weight: int = 100
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    status: str = 'published'

class QuestionOut(QuestionIn):
    id: UUID
    class Config:
        from_attributes = True

class ClassInfo(BaseModel):
    name: str

class QuizOut(BaseModel):
    id: UUID
    topic: str
    type: str
    class_id: UUID
    duration_minutes: int
    max_attempts: Optional[int] = None
    weight: int
    class Config:
        from_attributes = True

# New model for the detailed quiz list for teachers
class QuizForTeacher(QuizOut):
    created_at: datetime
    is_active: bool
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    students_taken: int = 0
    students_not_taken: int = 0
    status: str # Add this line

# New model for updating quiz settings
class QuizSettingsIn(BaseModel):
    is_active: Optional[bool] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

class QuizWithQuestions(QuizOut):
    questions: List[QuestionOut]
    classes: Optional[ClassInfo] = None
    visible_to: Optional[List[UUID]] = None
    current_attempt_number: int = 1
    started_at: Optional[datetime] = None
    result_id: Optional[UUID] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

class CheckpointIn(BaseModel):
    question_id: UUID
    answer: str
    attempt_number: int

class CheckpointOut(BaseModel):
    id: UUID
    user_id: UUID
    quiz_id: UUID
    question_id: UUID
    answer: str
    attempt_number: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class QuizSubmissionIn(BaseModel):
    result_id: UUID
    user_answers: dict # {question_id: answer_text}

class QuizCancelIn(BaseModel):
    result_id: UUID

class QuizAttemptStartOut(BaseModel):
    result_id: UUID
    started_at: datetime
    attempt_number: int

# --- Endpoints ---
@router.post("/{class_id}", status_code=status.HTTP_201_CREATED, response_model=QuizOut, dependencies=[Depends(verify_class_membership)])
def create_quiz(
    class_id: UUID,
    payload: QuizIn,
    sb: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    teacher_id = current_teacher.get("id")
    if any(q.type != payload.type for q in payload.questions):
        raise HTTPException(status_code=400, detail="All question types must match the quiz type.")

    try:
        quiz_res = sb.table("quizzes").insert({
            "class_id": str(class_id),
            "topic": payload.topic,
            "type": payload.type,
            "duration_minutes": payload.duration_minutes,
            "max_attempts": payload.max_attempts,
            "weight": payload.weight,
            "available_from": payload.available_from.isoformat() if payload.available_from else None,
            "available_until": payload.available_until.isoformat() if payload.available_until else None,
            "status": payload.status,
        }).execute()
        
        if not quiz_res.data:
            raise HTTPException(status_code=500, detail="Failed to create quiz.")
        
        new_quiz = quiz_res.data[0]
        questions_to_insert = [
            {**q.model_dump(exclude={'id'}), "quiz_id": new_quiz['id']} for q in payload.questions
        ]
        
        questions_res = sb.table("questions").insert(questions_to_insert).execute()

        if not questions_res.data:
            sb.table("quizzes").delete().eq("id", new_quiz['id']).execute()
            raise HTTPException(status_code=500, detail="Failed to create questions for the quiz.")

        if payload.visible_to is not None:
            visibility_to_insert = [
                {"quiz_id": new_quiz['id'], "user_id": str(student_id)} for student_id in payload.visible_to
            ]
            if visibility_to_insert:
                sb.table("quiz_visibility").insert(visibility_to_insert).execute()

        return new_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.put("/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: UUID,
    payload: QuizIn,
    sb_admin: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Updates an existing quiz and its questions."""
    # RLS policies will enforce that the user is a teacher for the class.

    if any(q.type != payload.type for q in payload.questions):
        raise HTTPException(status_code=400, detail="All question types must match the quiz type.")

    try:
        # 1. Update quiz details
        updated_quiz_data = {
            "topic": payload.topic,
            "type": payload.type,
            "duration_minutes": payload.duration_minutes,
            "max_attempts": payload.max_attempts,
            "weight": payload.weight,
            "available_from": payload.available_from.isoformat() if payload.available_from else None,
            "available_until": payload.available_until.isoformat() if payload.available_until else None,
            "status": payload.status,
        }
        sb_admin.table("quizzes").update(updated_quiz_data).eq("id", str(quiz_id)).execute()

        # 2. Handle questions (upsert, insert, delete)
        existing_questions_res = sb_admin.table("questions").select("id").eq("quiz_id", str(quiz_id)).execute()
        existing_question_ids = {str(q['id']) for q in existing_questions_res.data or []}
        
        questions_to_insert = []
        questions_to_update = []
        incoming_question_ids = set()

        for q_payload in payload.questions:
            question_dict = q_payload.model_dump()
            question_dict['quiz_id'] = str(quiz_id)

            if q_payload.id:
                # This is an existing question to be updated
                incoming_question_ids.add(str(q_payload.id))
                question_dict['id'] = str(q_payload.id) # Ensure UUID is string
                questions_to_update.append(question_dict)
            else:
                # This is a new question to be inserted
                question_dict.pop('id', None) # Remove null ID
                questions_to_insert.append(question_dict)

        if questions_to_update:
            sb_admin.table("questions").upsert(questions_to_update).execute()
        if questions_to_insert:
            sb_admin.table("questions").insert(questions_to_insert).execute()

        questions_to_delete_ids = existing_question_ids - incoming_question_ids
        if questions_to_delete_ids:
            sb_admin.table("questions").delete().in_("id", list(questions_to_delete_ids)).execute()

        # 3. Sync quiz visibility
        if payload.visible_to is not None:
            sb_admin.table("quiz_visibility").delete().eq("quiz_id", str(quiz_id)).execute()
            if payload.visible_to:
                visibility_to_insert = [
                    {"quiz_id": str(quiz_id), "user_id": str(student_id)} for student_id in payload.visible_to
                ]
                sb_admin.table("quiz_visibility").insert(visibility_to_insert).execute()

        updated_quiz_res = sb_admin.table("quizzes").select("*").eq("id", str(quiz_id)).single().execute()
        return updated_quiz_res.data

    except Exception as e:
        # Log the full error for debugging
        print(f"Error during quiz update: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.patch("/{quiz_id}/settings", status_code=status.HTTP_204_NO_CONTENT)
def update_quiz_settings(
    quiz_id: UUID,
    settings: QuizSettingsIn,
    sb: Client = Depends(get_supabase),
    user: dict = Depends(get_current_teacher_user)
):
    """
    Updates settings for a quiz, such as activation status and availability window.
    Only accessible by teachers of the class.
    """
    # RLS policies will handle authorization.
    quiz_res = sb.table("quizzes").select("id").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found")

    update_data = settings.model_dump(exclude_unset=True)
    if not update_data:
        return

    # Convert datetime objects to ISO 8601 strings for JSON serialization
    if 'available_from' in update_data and update_data['available_from'] is not None:
        update_data['available_from'] = update_data['available_from'].isoformat()
    
    if 'available_until' in update_data and update_data['available_until'] is not None:
        update_data['available_until'] = update_data['available_until'].isoformat()

    try:
        sb.table("quizzes").update(update_data).eq("id", str(quiz_id)).execute()
    except Exception as e:
        print(f"Error during quiz settings update: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred while updating quiz settings: {str(e)}")

    return

@router.get("/{class_id}", response_model=List[QuizForTeacher], dependencies=[Depends(verify_class_membership)])
def list_quizzes(
    class_id: UUID,
    teacher_view: bool = False,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Lists available quizzes for a specific class."""
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    print(f"DEBUG: list_quizzes called for user_id: {user_id}, role: {user_role}, class_id: {class_id}, teacher_view: {teacher_view}")

    if teacher_view:
        # 1. Fetch all quizzes for the class.
        quizzes_res = sb.table("quizzes").select("*").eq("class_id", str(class_id)).order("created_at", desc=True).execute()
        quizzes_data = quizzes_res.data or []
        if not quizzes_data:
            return []

        # 2. Get all student IDs for the class.
        class_members_res = sb.table("class_members").select("user_id, profiles(role)").eq("class_id", str(class_id)).execute()
        student_ids = {
            m["user_id"] for m in class_members_res.data 
            if m.get("profiles") and m["profiles"]["role"] == "student"
        }
        total_students = len(student_ids)

        # 3. Get all results (including scores) for the quizzes in this class.
        quiz_ids = [q["id"] for q in quizzes_data]
        results_res = sb.table("results").select("quiz_id, user_id, score").in_("quiz_id", quiz_ids).execute()
        results_data = results_res.data or []

        # 4. Create maps for students who took the quiz and for calculating average scores
        takers_map = {} # quiz_id -> set of student_ids who took it
        quiz_scores_map = {} # quiz_id -> list of scores

        for result in results_data:
            quiz_id_res = result["quiz_id"]
            user_id_res = result["user_id"]
            score_res = result["score"]

            if user_id_res in student_ids:  # Only consider results from students
                # For takers_map
                if quiz_id_res not in takers_map:
                    takers_map[quiz_id_res] = set()
                takers_map[quiz_id_res].add(user_id_res)

                # For quiz_scores_map (only valid scores)
                if score_res is not None:
                    if quiz_id_res not in quiz_scores_map:
                        quiz_scores_map[quiz_id_res] = []
                    quiz_scores_map[quiz_id_res].append(score_res)

        # 5. Format the final output.
        formatted_quizzes = []
        for quiz in quizzes_data:
            quiz_id_item = quiz["id"]
            students_taken_count = len(takers_map.get(quiz_id_item, set()))
            
            quiz_average_scores = quiz_scores_map.get(quiz_id_item, [])
            average_score_for_quiz = sum(quiz_average_scores) / len(quiz_average_scores) if quiz_average_scores else None

            formatted_quiz = {
                **quiz,
                "students_taken": students_taken_count,
                "students_not_taken": total_students - students_taken_count,
            }
            formatted_quizzes.append(formatted_quiz)

        return formatted_quizzes
    else:
        # For student view, use RPC function to filter by visibility
        student_id = current_user.get("id")
        response = sb.rpc('get_visible_quizzes_for_student', {
            'class_id_param': str(class_id),
            'student_id_param': str(student_id)
        }).eq('status', 'published').execute()
        return response.data or []

@router.get("/{quiz_id}/details", response_model=QuizWithQuestions)
def get_quiz_details(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Retrieves details for a specific quiz, including its questions."""
    quiz_res = sb.table("quizzes").select("*, classes(class_name)").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz_data = quiz_res.data
    user_role = current_user.get('role')
    user_id = current_user.get("id")
    print(f"DEBUG: get_quiz_details called for user_id: {user_id}, quiz_id: {quiz_id}")

    # Server-side security check for students
    if user_role == 'student':
        if not quiz_data.get('is_active', False):
            raise HTTPException(status_code=403, detail="This quiz is currently inactive.")

        now = datetime.now().astimezone()
        available_from_str = quiz_data.get('available_from')
        available_until_str = quiz_data.get('available_until')

        if available_from_str:
            available_from = datetime.fromisoformat(available_from_str)
            if now < available_from:
                raise HTTPException(status_code=403, detail="This quiz is not yet available.")

        if available_until_str:
            available_until = datetime.fromisoformat(available_until_str)
            if now > available_until:
                raise HTTPException(status_code=403, detail="The deadline for this quiz has passed.")

    # RLS on the 'quizzes' table already ensures the user has access.
    
    questions_res = sb.table("questions").select("*").eq("quiz_id", str(quiz_id)).execute()
    visibility_res = sb.table("quiz_visibility").select("user_id").eq("quiz_id", str(quiz_id)).execute()
    visible_to_ids = [item['user_id'] for item in visibility_res.data]

    # Add current_attempt_number logic here
    user_id = current_user.get("id")
    started_at_val = None
    result_id_val = None
    current_attempt_number = 1 # Initialize current_attempt_number here

    if user_role == 'student':
        # Check for an existing, unfinished attempt
        existing_result_res = sb.table("results").select("id, started_at, attempt_number")\
            .eq("user_id", user_id)\
            .eq("quiz_id", str(quiz_id))\
            .is_("ended_at", None)\
            .order("started_at", desc=True)\
            .limit(1)\
            .execute()
        
        if existing_result_res.data:
            existing_result = existing_result_res.data[0]
            result_id_val = UUID(existing_result['id'])
            started_at_val = datetime.fromisoformat(existing_result['started_at'])
            current_attempt_number = existing_result['attempt_number']
            print(f"DEBUG: Existing attempt found. result_id_val: {result_id_val}, started_at_val: {started_at_val}")
        else:
            # No existing unfinished attempt, so no started_at or result_id yet
            # Frontend will display 'Start Quiz' button
            print(f"DEBUG: No existing unfinished attempt found for quiz {quiz_id} and user {user_id}.")

    # Rename 'classes' to 'class_info' to match frontend model if needed
    if quiz_data.get("classes"):
        quiz_data["classes"] = {"name": quiz_data["classes"]["class_name"]}

    return {**quiz_data, "questions": questions_res.data or [], "visible_to": visible_to_ids, "current_attempt_number": current_attempt_number, "started_at": started_at_val, "result_id": result_id_val}


@router.delete("/{quiz_id}", status_code=204)
async def delete_quiz(quiz_id: str, user: dict = Depends(get_current_teacher_user), sb: Client = Depends(get_supabase)):
    # First, delete associated questions and answers
    questions_response = sb.from_('questions').select('id').eq('quiz_id', quiz_id).execute()
    question_ids = [q['id'] for q in questions_response.data]

    if question_ids:
        sb.from_('quiz_answers').delete().in_('question_id', question_ids).execute()
        sb.from_('questions').delete().eq('quiz_id', quiz_id).execute()
    
    # Then delete the quiz itself
    response = sb.from_('quizzes').delete().eq('id', quiz_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Quiz not found or already deleted")
    return 

@router.post("/{quiz_id}/duplicate", response_model=QuizOut)
async def duplicate_quiz(quiz_id: str, user: dict = Depends(get_current_teacher_user), sb: Client = Depends(get_supabase)):
    # Fetch the original quiz
    original_quiz_response = sb.from_('quizzes').select('id, topic, type, duration_minutes, max_attempts, user_id, class_id').eq('id', quiz_id).single().execute()
    if not original_quiz_response.data:
        raise HTTPException(status_code=404, detail="Original quiz not found")
    original_quiz = original_quiz_response.data

    # Create a new quiz entry
    new_quiz_data = {
        "topic": f"Copy of {original_quiz['topic']}",
        "type": original_quiz['type'],
        "duration_minutes": original_quiz['duration_minutes'],
        "max_attempts": original_quiz['max_attempts'],
        "user_id": user['id'],
        "class_id": original_quiz['class_id']
    }
    new_quiz_response = sb.from_('quizzes').insert(new_quiz_data).execute()
    if not new_quiz_response.data:
        raise HTTPException(status_code=500, detail="Failed to duplicate quiz")
    new_quiz = new_quiz_response.data[0]
    
    # Fetch original questions
    original_questions_response = sb.from_('questions').select('id, text, type, options, answer').eq('quiz_id', quiz_id).execute()
    original_questions = original_questions_response.data

    if original_questions:
        questions_to_insert = []
        for oq in original_questions:
            questions_to_insert.append({
                "quiz_id": new_quiz['id'],
                "text": oq['text'],
                "type": oq['type'],
                "options": oq['options'],
                "answer": oq['answer']
            })
        sb.from_('questions').insert(questions_to_insert).execute()
    
    return new_quiz

@router.post("/{quiz_id}/checkpoint", status_code=status.HTTP_200_OK, response_model=CheckpointOut)
async def save_quiz_checkpoint(
    quiz_id: UUID,
    payload: CheckpointIn,
    sb: Client = Depends(get_supabase), # RLS-enabled client
    current_student: dict = Depends(get_current_student_user),
    is_member: bool = Depends(verify_quiz_membership)
):
    """Saves a student's partial answer for a quiz as a checkpoint."""
    user_id = current_student.get("id")

    try:
        # Verify the quiz exists and belongs to the class
        quiz_check = sb.table("quizzes").select("id, class_id").eq("id", str(quiz_id)).single().execute()
        if not quiz_check.data:
            raise HTTPException(status_code=404, detail="Quiz not found.")
        
        # RLS on quiz_checkpoints will ensure user_id matches auth.uid()
        checkpoint_data = {
            "user_id": str(user_id),
            "quiz_id": str(quiz_id),
            "question_id": str(payload.question_id),
            "answer": payload.answer,
            "attempt_number": payload.attempt_number,
        }
        
        # Upsert the checkpoint
        response = sb.table("quiz_checkpoints").upsert(
            checkpoint_data,
            on_conflict="user_id,quiz_id,question_id,attempt_number"
        ).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save checkpoint.")
        
        return response.data[0]
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print(f"Error saving quiz checkpoint: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{quiz_id}/checkpoint", response_model=List[CheckpointOut])
async def get_quiz_checkpoints(
    quiz_id: UUID,
    attempt_number: int,
    sb: Client = Depends(get_supabase), # RLS-enabled client
    current_student: dict = Depends(get_current_student_user),
    is_member: bool = Depends(verify_quiz_membership)
):
    """Retrieves all saved checkpoints for a student for a specific quiz and attempt."""
    user_id = current_student.get("id")

    try:
        # Verify the quiz exists and belongs to the class
        quiz_check = sb.table("quizzes").select("id, class_id").eq("id", str(quiz_id)).single().execute()
        if not quiz_check.data:
            raise HTTPException(status_code=404, detail="Quiz not found.")

        # RLS on quiz_checkpoints will ensure user_id matches auth.uid()
        response = sb.table("quiz_checkpoints").select("*")\
            .eq("user_id", str(user_id))\
            .eq("quiz_id", str(quiz_id))\
            .eq("attempt_number", attempt_number)\
            .execute()
        
        return response.data or []
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print(f"Error retrieving quiz checkpoints: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/{quiz_id}/submit", status_code=status.HTTP_200_OK)
async def submit_quiz(
    quiz_id: UUID,
    payload: QuizSubmissionIn,
    sb: Client = Depends(get_supabase_admin), # Use admin client for score update
    current_student: dict = Depends(get_current_student_user),
    is_member: bool = Depends(verify_quiz_membership)
):
    """Submits a student's quiz answers, calculates score, and marks the quiz as ended."""
    user_id = current_student.get("id")

    # 1. Verify the result entry and that it belongs to the user and is not yet ended
    result_res = sb.table("results").select("id, quiz_id, user_id, ended_at, attempt_number")\
        .eq("id", str(payload.result_id))\
        .eq("quiz_id", str(quiz_id))\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not result_res.data:
        raise HTTPException(status_code=404, detail="Quiz attempt not found or does not belong to user.")
    
    result_data = result_res.data
    if result_data.get("ended_at"):
        raise HTTPException(status_code=400, detail="Quiz has already been submitted.")

    attempt_number = result_data["attempt_number"]

    # 2. Fetch quiz questions and correct answers
    questions_res = sb.table("questions").select("id, type, answer")\
        .eq("quiz_id", str(quiz_id))\
        .execute()
    
    if not questions_res.data:
        raise HTTPException(status_code=404, detail="Questions for this quiz not found.")
    
    questions_map = {UUID(q["id"]): q for q in questions_res.data}

    # 3. Calculate score and store individual answers
    # Fetch quiz details including its weight
    quiz_details_res = sb.table("quizzes").select("class_id, weight").eq("id", str(quiz_id)).single().execute()
    if not quiz_details_res.data:
        raise HTTPException(status_code=404, detail="Could not find quiz details.")
    quiz_weight = quiz_details_res.data['weight']

    mcq_correct = 0
    tf_correct = 0
    mcq_total = 0
    tf_total = 0

    answers_to_insert = []

    for q_id_str, user_answer in payload.user_answers.items():
        q_id = UUID(q_id_str)
        question = questions_map.get(q_id)

        if not question:
            continue

        is_correct = False
        if question["type"] == "mcq":
            mcq_total += 1
            if str(user_answer).lower().strip() == str(question.get("answer")).lower().strip():
                mcq_correct += 1
                is_correct = True
        elif question["type"] == "true_false":
            tf_total += 1
            if str(user_answer).lower().strip() == str(question.get("answer")).lower().strip():
                tf_correct += 1
                is_correct = True

        answers_to_insert.append({
            "result_id": str(payload.result_id),
            "question_id": str(q_id),
            "user_id": user_id,
            "answer": user_answer,
            "is_correct": is_correct if question["type"] in ["mcq", "true_false"] else None,
            "attempt_number": attempt_number
        })

    # Calculate score based on correct answers
    total_questions_answered = mcq_total + tf_total
    score = 0
    if total_questions_answered > 0:
        correct_answers = mcq_correct + tf_correct
        score = round((correct_answers / total_questions_answered) * 100)

    if answers_to_insert:
        sb.table("quiz_answers").insert(answers_to_insert).execute()

    # 4. Update the results table
    update_data = {
        "score": score,
        "total": 100, # Total is now always 100 as score is a percentage
        "ended_at": datetime.now(timezone.utc).isoformat()
    }
    print(f"DEBUG: Attempting to update result {payload.result_id} with data: {update_data}")
    try:
        # The .execute() method on Supabase client v2 raises an exception on failure,
        # so we don't need to check for an 'error' attribute anymore.
        update_res = sb.table("results").update(update_data).eq("id", str(payload.result_id)).execute()
        print(f"DEBUG: Update response data: {update_res.data}")
        print(f"DEBUG: Quiz result {payload.result_id} successfully updated with ended_at: {update_data['ended_at']}")
    except Exception as e:
        # This block will now catch API errors from the Supabase client as well as other exceptions.
        print(f"ERROR: Exception during result update for {payload.result_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during quiz result update: {str(e)}")

    return {"message": "Quiz submitted successfully", "score": score, "total": 100}

@router.post("/{quiz_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_quiz_attempt(
    quiz_id: UUID,
    payload: QuizCancelIn,
    sb: Client = Depends(get_supabase_admin), # Use admin client to update result
    current_student: dict = Depends(get_current_student_user),
    is_member: bool = Depends(verify_quiz_membership)
):
    """Cancels an ongoing quiz attempt, marking it as ended with a 'cancelled' status."""
    user_id = current_student.get("id")

    # 1. Verify the result entry and that it belongs to the user and is not yet ended
    result_res = sb.table("results").select("id, quiz_id, user_id, ended_at")\
        .eq("id", str(payload.result_id))\
        .eq("quiz_id", str(quiz_id))\
        .eq("user_id", user_id)\
        .single()\
        .execute()

    if not result_res.data:
        raise HTTPException(status_code=404, detail="Quiz attempt not found or does not belong to user.")
    
    result_data = result_res.data
    if result_data.get("ended_at"):
        raise HTTPException(status_code=400, detail="Quiz has already been submitted or cancelled.")

    # 2. Update the results table to mark as cancelled
    update_data = {
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "status": "cancelled" # Add a status column to your results table if you want to differentiate
    }
    
    try:
        update_res = sb.table("results").update(update_data).eq("id", str(payload.result_id)).execute()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during quiz cancellation: {str(e)}")

    return {"message": "Quiz attempt cancelled successfully"}

@router.post("/{quiz_id}/start", status_code=status.HTTP_200_OK, response_model=QuizAttemptStartOut)
async def start_quiz_attempt(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase_admin), # Use admin client to create result
    current_student: dict = Depends(get_current_student_user),
    is_member: bool = Depends(verify_quiz_membership) # Ensure student is member of class
):
    """
    Starts a new quiz attempt. An attempt is only counted upon submission,
    so this logic checks against the number of *submitted* quizzes.
    """
    user_id = current_student.get("id")
    print(f"DEBUG: start_quiz_attempt called for user_id: {user_id}, quiz_id: {quiz_id}")

    # 1. Check if there's an existing unfinished attempt.
    # The frontend should prevent this, but it's a good server-side safeguard.
    existing_result_res = sb.table("results").select("id")\
        .eq("user_id", user_id)\
        .eq("quiz_id", str(quiz_id))\
        .is_("ended_at", None)\
        .limit(1)\
        .execute()
    
    if existing_result_res.data:
        raise HTTPException(status_code=400, detail="An unfinished quiz attempt already exists. Please resume or cancel it.")

    # 2. Get max_attempts from the quiz
    quiz_res = sb.table("quizzes").select("max_attempts").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    max_attempts = quiz_res.data.get('max_attempts') or 1 # Default to 1 if not set

    # 3. Count all previous attempts for this user and quiz (finished or not).
    # An attempt is counted as soon as it is started.
    all_attempts_res = sb.table("results").select("id", count="exact")\
        .eq("quiz_id", str(quiz_id))\
        .eq("user_id", user_id)\
        .execute()
    
    previous_attempts_count = all_attempts_res.count or 0
    
    if previous_attempts_count >= max_attempts:
        raise HTTPException(status_code=403, detail=f"Maximum attempt limit ({max_attempts}) for this quiz has been reached.")

    # 4. The new attempt number is the number of previous attempts + 1.
    current_attempt_number = previous_attempts_count + 1

    # 5. Create a new result entry for the new attempt.
    new_result_data = {
        "quiz_id": str(quiz_id),
        "user_id": user_id,
        "attempt_number": current_attempt_number,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "in_progress" # Explicitly set status
    }
    new_result_res = sb.table("results").insert(new_result_data).execute()
    if not new_result_res.data:
        raise HTTPException(status_code=500, detail="Failed to create new quiz attempt record.")
    
    new_result = new_result_res.data[0]
    print(f"DEBUG: New quiz attempt started: result_id={new_result['id']}, attempt_number={current_attempt_number}")
    
    return {
        "result_id": UUID(new_result['id']),
        "started_at": datetime.fromisoformat(new_result['started_at']),
        "attempt_number": current_attempt_number
    }