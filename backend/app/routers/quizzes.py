from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from ..dependencies import get_supabase, get_current_user, get_current_teacher_user, verify_class_membership
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
    class Config: { "from_attributes": True }

class QuizWithQuestions(QuizOut):
    questions: List[QuestionOut]
    classes: Optional[ClassInfo] = None

# --- Endpoints ---
@router.post("/{class_id}", status_code=status.HTTP_201_CREATED, response_model=QuizOut, dependencies=[Depends(verify_class_membership)])
def create_quiz(
    class_id: UUID,
    payload: QuizIn,
    sb: Client = Depends(get_supabase),
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

        return new_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.put("/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: UUID,
    payload: QuizIn,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Updates an existing quiz and its questions. Teacher must be the creator."""
    teacher_id = current_teacher.get("id")
    print(payload.model_dump_json(indent=2)) # Debugging: Print incoming payload

    # 1. Verify quiz exists and was created by the current teacher
    quiz_res = sb.table("quizzes").select("id, user_id, class_id").eq("id", str(quiz_id)).single().execute()
    if not quiz_res.data:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    
    existing_quiz = quiz_res.data
    if str(existing_quiz["user_id"]) != str(teacher_id):
        raise HTTPException(status_code=403, detail="You are not authorized to update this quiz.")

    # 2. Verify teacher is a member of the class this quiz belongs to
    class_id = existing_quiz["class_id"]
    member_res = sb.table("class_members").select("id").eq("class_id", class_id).eq("user_id", teacher_id).single().execute()
    if not member_res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of the class this quiz belongs to."
        )

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
        sb.table("quizzes").update(updated_quiz_data).eq("id", str(quiz_id)).execute()

        # 3. Handle questions
        existing_questions_res = sb.table("questions").select("id").eq("quiz_id", str(quiz_id)).execute()
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
            sb.table("questions").upsert(questions_to_update, on_conflict="id").execute()
        if questions_to_insert:
            sb.table("questions").insert(questions_to_insert).execute()

        # Identify and delete removed questions
        questions_to_delete_ids = existing_question_ids - incoming_question_ids
        if questions_to_delete_ids:
            sb.table("questions").delete().in_("id", list(questions_to_delete_ids)).execute()

        # Fetch the updated quiz to return
        updated_quiz_res = sb.table("quizzes").select("id, topic, type, class_id, duration_minutes").eq("id", str(quiz_id)).single().execute()
        return updated_quiz_res.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/{class_id}", response_model=List[QuizOut], dependencies=[Depends(verify_class_membership)])
def list_quizzes(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
):
    """Lists available quizzes for a specific class. User must be a member."""
    query = sb.table("quizzes").select("id, topic, type, class_id, duration_minutes").eq("class_id", str(class_id))
    return query.order("created_at", desc=True).execute().data or []

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

    # Verify user is a member of the class this quiz belongs to
    quiz_class_id = quiz_data['class_id']
    user_id = current_user.get('id')
    member_res = sb.table("class_members").select("id").eq("class_id", quiz_class_id).eq("user_id", user_id).single().execute()
    if not member_res.data:
        raise HTTPException(status_code=403, detail="You are not a member of the class this quiz belongs to.")

    questions_res = sb.table("questions").select("*").eq("quiz_id", str(quiz_id)).execute()
    
    return {**quiz_data, "questions": questions_res.data or []}

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