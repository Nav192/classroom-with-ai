from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import uuid
from uuid import UUID
from datetime import datetime

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_teacher_user, verify_class_membership
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

# New model for updating quiz settings
class QuizSettingsIn(BaseModel):
    is_active: Optional[bool] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None

class QuizWithQuestions(QuizOut):
    questions: List[QuestionOut]
    classes: Optional[ClassInfo] = None
    visible_to: Optional[List[UUID]] = None

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
            "user_id": str(teacher_id),
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

        # 3. Get all results for the quizzes in this class.
        quiz_ids = [q["id"] for q in quizzes_data]
        results_res = sb.table("results").select("quiz_id, user_id").in_("quiz_id", quiz_ids).execute()
        results_data = results_res.data or []

        # 4. Create a map of quiz_id -> set of students who took it
        takers_map = {}
        for result in results_data:
            quiz_id_res = result["quiz_id"]
            user_id_res = result["user_id"]
            if user_id_res in student_ids:  # Only count students
                if quiz_id_res not in takers_map:
                    takers_map[quiz_id_res] = set()
                takers_map[quiz_id_res].add(user_id_res)

        # 5. Format the final output.
        formatted_quizzes = []
        for quiz in quizzes_data:
            quiz_id_item = quiz["id"]
            students_taken_count = len(takers_map.get(quiz_id_item, set()))
            
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
        }).execute()
        return response.data or []

@router.get("/{quiz_id}/details", response_model=QuizWithQuestions)
def get_quiz_details(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Retrieves details for a specific quiz, including its questions."""
    from datetime import datetime, timezone

    quiz_res = sb.table("quizzes").select("*, classes(class_name)").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz_data = quiz_res.data
    user_role = current_user.get('role')

    # Server-side security check for students
    if user_role == 'student':
        if not quiz_data.get('is_active', False):
            raise HTTPException(status_code=403, detail="This quiz is currently inactive.")

        now = datetime.now(timezone.utc)
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

    # Rename 'classes' to 'class_info' to match frontend model if needed
    if quiz_data.get("classes"):
        quiz_data["classes"] = {"name": quiz_data["classes"]["class_name"]}

    return {**quiz_data, "questions": questions_res.data or [], "visible_to": visible_to_ids}


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
