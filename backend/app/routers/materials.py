from typing import Literal

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from ..dependencies import get_supabase


router = APIRouter()


@router.get("")
def list_materials(class_id: str | None = None, topic: str | None = None):
	sb = get_supabase()
	q = sb.table("materials").select("*")
	if class_id:
		q = q.eq("class_id", class_id)
	if topic:
		q = q.eq("topic", topic)
	return q.execute().data


@router.post("")
async def upload_material(
	file: UploadFile = File(...),
	class_id: str = Form(...),
	topic: str = Form(...),
	file_type: Literal["pdf", "ppt", "txt"] = Form(...),
):
	# In MVP, just store metadata and raw file in Supabase storage (manual step). Later: RAG ingestion.
	try:
		sb = get_supabase()
		# Create a row in Materials table (assumes table exists)
		insert_res = sb.table("materials").insert(
			{
				"class_id": class_id,
				"topic": topic,
				"filename": file.filename,
				"mime_type": file.content_type,
				"file_type": file_type,
			}
		).execute()
		return {"ok": True, "material": insert_res.data[0] if insert_res.data else None}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


