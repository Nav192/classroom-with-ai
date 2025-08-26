from fastapi import APIRouter, HTTPException

from ..dependencies import get_supabase


router = APIRouter()


@router.get("/{user_id}")
def get_progress(user_id: str):
	sb = get_supabase()
	try:
		materials = sb.table("materials_progress").select("*").eq("user_id", user_id).execute().data
		quizzes = sb.table("results").select("*").eq("user_id", user_id).execute().data
		return {"materials": materials or [], "quizzes": quizzes or []}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


