from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    BackgroundTasks,
    status,
)
from supabase import Client
from typing import List
from uuid import UUID
from pydantic import BaseModel

from ..dependencies import get_supabase, get_current_user, get_current_teacher_user
from ..services.rag import process_material_for_rag

router = APIRouter()

class MaterialResponse(BaseModel):
    id: UUID
    class_id: str
    topic: str
    filename: str
    file_type: str
    user_id: UUID
    class Config:
        from_attributes = True

@router.get("", response_model=List[MaterialResponse])
def list_materials(
    class_id: str | None = None,
    topic: str | None = None,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Menampilkan daftar materi, bisa difilter berdasarkan kelas atau topik."""
    query = sb.table("materials").select("id, class_id, topic, filename, file_type, user_id")
    if class_id:
        query = query.eq("class_id", class_id)
    if topic:
        query = query.eq("topic", topic)
    
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    class_id: str = Form(...),
    topic: str = Form(...),
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Mengunggah file materi dan memicu proses RAG di background."""
    user_id = current_teacher.get("id")
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension not in ['pdf', 'ppt', 'pptx', 'txt']:
        raise HTTPException(status_code=400, detail=f"Tipe file '.{file_extension}' tidak didukung.")

    try:
        file_content = await file.read()
        storage_path = f"{user_id}/{class_id}/{topic}/{file.filename}"

        sb.storage.from_("materials").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        db_response = sb.table("materials").upsert({
            "class_id": class_id,
            "topic": topic,
            "filename": file.filename,
            "mime_type": file.content_type,
            "file_type": file_extension.replace('pptx', 'ppt'),
            "storage_path": storage_path,
            "user_id": user_id,
        }, on_conflict="storage_path").execute()

        if not db_response.data:
            raise HTTPException(status_code=500, detail="Gagal menyimpan metadata materi ke database.")

        material_record = db_response.data[0]
        background_tasks.add_task(process_material_for_rag, material_record['id'], storage_path, sb)

        return {"message": "Materi berhasil diunggah. Proses embedding akan berjalan di background.", "material_id": material_record['id']}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")