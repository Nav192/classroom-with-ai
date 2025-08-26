from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import get_supabase


router = APIRouter()


class AnswerSubmit(BaseModel):
	question_id: str
	response: str


class SubmitResultRequest(BaseModel):
	quiz_id: str
	user_id: str
	answers: List[AnswerSubmit]
	started_at: str
	ended_at: str


@router.post("/submit")
def submit_result(payload: SubmitResultRequest):
	sb = get_supabase()
	try:
		# Simple auto-grading for MCQ/TrueFalse based on stored answer field
		score = 0
		total = len(payload.answers)
		for ans in payload.answers:
			q = sb.table("questions").select("answer").eq("id", ans.question_id).single().execute()
			if q.data and q.data.get("answer") is not None and str(q.data["answer"]).strip() == str(ans.response).strip():
				score += 1
		res = sb.table("results").insert(
			{
				"quiz_id": payload.quiz_id,
				"user_id": payload.user_id,
				"score": score,
				"total": total,
				"started_at": payload.started_at,
				"ended_at": payload.ended_at,
			}
		).execute()
		return {"result": res.data[0] if res.data else None}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


@router.get("/history/{user_id}")
def get_history(user_id: str, topic: Optional[str] = None):
	sb = get_supabase()
	try:
		q = sb.table("results").select("*").eq("user_id", user_id)
		if topic:
			q = q.eq("topic", topic)
		return q.execute().data
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


