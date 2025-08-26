from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import get_supabase


router = APIRouter()


class QuestionType(str, Enum):
	mcq = "mcq"
	true_false = "true_false"
	essay = "essay"


class Question(BaseModel):
	text: str
	type: QuestionType
	options: Optional[List[str]] = None
	answer: Optional[str] = None


class CreateQuizRequest(BaseModel):
	class_id: str
	topic: str
	type: QuestionType
	questions: List[Question]
	duration_minutes: int
	max_attempts: int = 2


@router.post("")
def create_quiz(payload: CreateQuizRequest):
	if any(q.type != payload.type for q in payload.questions):
		raise HTTPException(status_code=400, detail="All questions must match quiz type")

	sb = get_supabase()
	try:
		quiz_res = sb.table("quizzes").insert(
			{
				"class_id": payload.class_id,
				"topic": payload.topic,
				"type": payload.type,
				"duration_minutes": payload.duration_minutes,
				"max_attempts": payload.max_attempts,
			}
		).execute()
		quiz = quiz_res.data[0]
		for q in payload.questions:
			sb.table("questions").insert(
				{
					"quiz_id": quiz["id"],
					"text": q.text,
					"type": q.type,
					"options": q.options,
					"answer": q.answer,
				}
			).execute()
		return {"quiz": quiz}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


