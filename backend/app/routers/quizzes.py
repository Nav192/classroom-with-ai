from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_teacher_user, verify_class_membership
from supabase import Client

router = APIRouter()

# --- Pydantic Models ---
class QuestionIn(BaseModel):
    id: Optional[UUID] = None
    text: str
    type: str # 'mcq', 'true_false', 'essay'
    options: Optional[List[str]] = None
    answer: Optional[str] = None

class QuizIn(BaseModel):
    topic: str
    type: str # 'mcq', 'true_false', 'essay'
    duration_minutes: int
    max_attempts: Optional[int] = 2
    questions: List[QuestionIn]
    visible_to: Optional[List[UUID]] = None

class QuestionOut(QuestionIn):
    id: UUID
    class Config: { "from_attributes": True }

class ClassInfo(BaseModel):
    name: str

class QuizOut(BaseModel):
    id: UUID
    topic: str
    type: str
    class_id: UUID
    duration_minutes: int
    max_attempts: Optional[int] = None
    is_archived: bool = False
    class Config:
        from_attributes = True

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
    print(payload.model_dump_json(indent=2)) # Debugging: Print incoming payload

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

        # Handle quiz visibility
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
    """Updates an existing quiz and its questions. Teacher must be the creator."""
    teacher_id = current_teacher.get("id")
    print(payload.model_dump_json(indent=2)) # Debugging: Print incoming payload

    # 1. Verify quiz exists and was created by the current teacher
    quiz_res = sb_admin.table("quizzes").select("id, user_id, class_id").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    
    existing_quiz = quiz_res.data
    quiz_creator_id = existing_quiz["user_id"]
    class_id = existing_quiz["class_id"]

    # Check if teacher is a member of the class OR the creator of the quiz OR the creator of the class
    is_member = sb_admin.table("class_members").select("id").eq("class_id", class_id).eq("user_id", teacher_id).execute().data
    is_class_creator = sb_admin.table("classes").select("id").eq("id", class_id).eq("created_by", teacher_id).execute().data
    is_quiz_creator = (str(teacher_id) == str(quiz_creator_id))

    if not is_member and not is_class_creator and not is_quiz_creator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update this quiz.")

    if any(q.type != payload.type for q in payload.questions):
        raise HTTPException(status_code=400, detail="All question types must match the quiz type.")

    try:
        # 2. Update quiz details
        updated_quiz_data = {
            "topic": payload.topic,
            "type": payload.type,
            "duration_minutes": payload.duration_minutes,
            "max_attempts": payload.max_attempts,
        }
        sb_admin.table("quizzes").update(updated_quiz_data).eq("id", str(quiz_id)).execute()

        # 3. Handle questions
        existing_questions_res = sb_admin.table("questions").select("id").eq("quiz_id", str(quiz_id)).execute()
        existing_question_ids = {q["id"] for q in existing_questions_res.data or []}
        
        questions_to_insert = []
        questions_to_update = []
        incoming_question_ids = set()

        for q_payload in payload.questions:
            if q_payload.id: # Existing question
                incoming_question_ids.add(str(q_payload.id))
                questions_to_update.append({
                    "id": str(q_payload.id),
                    "text": q_payload.text,
                    "type": q_payload.type,
                    "options": q_payload.options,
                    "answer": q_payload.answer,
                    "quiz_id": str(quiz_id)
                })
            else: # New question
                questions_to_insert.append({
                    "text": q_payload.text,
                    "type": q_payload.type,
                    "options": q_payload.options,
                    "answer": q_payload.answer,
                    "quiz_id": str(quiz_id)
                })
        
        # Perform updates and inserts
        if questions_to_update:
            sb_admin.table("questions").upsert(questions_to_update, on_conflict="id").execute()
        if questions_to_insert:
            sb_admin.table("questions").insert(questions_to_insert).execute()

        # Identify and delete removed questions
        questions_to_delete_ids = existing_question_ids - incoming_question_ids
        if questions_to_delete_ids:
            sb_admin.table("questions").delete().in_("id", list(questions_to_delete_ids)).execute()

        # 4. Sync quiz visibility
        if payload.visible_to is not None:
            # Get current visibility settings
            existing_visibility_res = sb_admin.table("quiz_visibility").select("user_id").eq("quiz_id", str(quiz_id)).execute()
            existing_user_ids = {UUID(item['user_id']) for item in existing_visibility_res.data}
            
            incoming_user_ids = set(payload.visible_to)
            
            # Determine who to add and who to remove
            ids_to_add = incoming_user_ids - existing_user_ids
            ids_to_remove = existing_user_ids - incoming_user_ids
            
            # Add new visibility entries
            if ids_to_add:
                sb_admin.table("quiz_visibility").insert([
                    {"quiz_id": str(quiz_id), "user_id": str(uid)} for uid in ids_to_add
                ]).execute()
                
            # Remove old visibility entries
            if ids_to_remove:
                sb_admin.table("quiz_visibility").delete().eq("quiz_id", str(quiz_id)).in_("user_id", [str(uid) for uid in ids_to_remove]).execute()
        else:
            # If visible_to is not provided or is null, assume visible to all -> clear all specific visibility rules
            sb_admin.table("quiz_visibility").delete().eq("quiz_id", str(quiz_id)).execute()

        # Fetch the updated quiz to return
        updated_quiz_res = sb_admin.table("quizzes").select("id, topic, type, class_id, duration_minutes, max_attempts").eq("id", str(quiz_id)).single().execute()
        return updated_quiz_res.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/{class_id}", response_model=List[QuizOut], dependencies=[Depends(verify_class_membership)])
def list_quizzes(
    class_id: UUID,
    teacher_view: bool = False,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user)
):
    """Lists available quizzes for a specific class based on visibility rules."""
    if teacher_view:
        # Fetch quizzes
        quizzes_res = sb.table("quizzes").select(
            "id, topic, type, class_id, duration_minutes, max_attempts"
        ).eq("class_id", str(class_id)).order("created_at", desc=True).execute()
        
        quizzes_data = quizzes_res.data or []
        
        # Fetch class details for all quizzes in one go to get is_archived status
        class_ids = list(set([q["class_id"] for q in quizzes_data]))
        classes_res = sb.table("classes").select("id, is_archived").in_("id", class_ids).execute()
        class_is_archived_map = {c["id"]: c["is_archived"] for c in classes_res.data}

        # Flatten the result to match QuizOut model
        formatted_quizzes = []
        for quiz_data in quizzes_data:
            formatted_quiz = {
                "id": quiz_data["id"],
                "topic": quiz_data["topic"],
                "type": quiz_data["type"],
                "class_id": quiz_data["class_id"],
                "duration_minutes": quiz_data["duration_minutes"],
                "max_attempts": quiz_data["max_attempts"],
                "is_archived": class_is_archived_map.get(quiz_data["class_id"], False), # Default to False if not found
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
    quiz_res = sb.table("quizzes").select("*").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz_data = quiz_res.data
    class_id = quiz_data.get("class_id")

    # Manually fetch class details
    if class_id:
        class_res = sb.table("classes").select("class_name").eq("id", str(class_id)).single().execute()
        if class_res.data:
            # Alias class_name to name to match the frontend expectation
            quiz_data["classes"] = {"name": class_res.data.get("class_name")}

    # Verify user is a member of the class OR the creator of the quiz OR the creator of the class
    quiz_class_id = quiz_data['class_id']
    user_id = current_user.get('id')
    quiz_creator_id = quiz_data.get('user_id') # Assuming quiz_data contains user_id of creator

    is_member = sb.table("class_members").select("id").eq("class_id", quiz_class_id).eq("user_id", user_id).execute().data
    is_class_creator = sb.table("classes").select("id").eq("id", quiz_class_id).eq("created_by", user_id).execute().data
    is_quiz_creator = (str(user_id) == str(quiz_creator_id))

    if not is_member and not is_class_creator and not is_quiz_creator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this quiz.")

    questions_res = sb.table("questions").select("*").eq("quiz_id", str(quiz_id)).execute()
    
    # Fetch visibility settings
    visibility_res = sb.table("quiz_visibility").select("user_id").eq("quiz_id", str(quiz_id)).execute()
    visible_to_ids = [item['user_id'] for item in visibility_res.data]

    return {**quiz_data, "questions": questions_res.data or [], "visible_to": visible_to_ids}

@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Deletes a quiz. Only accessible by the teacher who created it."""
    user_id = current_teacher.get("id")

    # Verify quiz exists and was created by the current teacher
    quiz_res = sb.table("quizzes").select("id, user_id").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    
    if str(quiz_res.data["user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="You are not authorized to delete this quiz.")

    # Delete the quiz (questions and results will be deleted by cascade)
    sb.table("quizzes").delete().eq("id", str(quiz_id)).execute()

    return