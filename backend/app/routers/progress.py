from fastapi import APIRouter, HTTPException

from ..dependencies import get_supabase


router = APIRouter()


@router.get("/{user_id}")
def get_progress(user_id: str):
	sb = get_supabase()
	try:
		# Get materials progress
		materials_progress = sb.table("materials_progress").select("*").eq("user_id", user_id).execute().data or []
		
		# Get all available materials to calculate completion
		all_materials = sb.table("materials").select("id, class_id, topic").execute().data or []
		
		# Get quiz results and calculate completion
		quiz_results = sb.table("results").select("*").eq("user_id", user_id).execute().data or []
		all_quizzes = sb.table("quizzes").select("id, class_id, topic").execute().data or []
		
		# Calculate completion percentages
		materials_completed = len([m for m in materials_progress if m.get("status") == "completed"])
		materials_total = len(all_materials)
		materials_percentage = (materials_completed / materials_total * 100) if materials_total > 0 else 0
		
		quizzes_completed = len(set(r.get("quiz_id") for r in quiz_results))
		quizzes_total = len(all_quizzes)
		quizzes_percentage = (quizzes_completed / quizzes_total * 100) if quizzes_total > 0 else 0
		
		overall_percentage = ((materials_percentage + quizzes_percentage) / 2) if (materials_total > 0 or quizzes_total > 0) else 0
		
		return {
			"user_id": user_id,
			"overall_percentage": round(overall_percentage, 1),
			"materials": {
				"completed": materials_completed,
				"total": materials_total,
				"percentage": round(materials_percentage, 1),
				"progress": materials_progress
			},
			"quizzes": {
				"completed": quizzes_completed,
				"total": quizzes_total,
				"percentage": round(quizzes_percentage, 1),
				"results": quiz_results
			}
		}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


