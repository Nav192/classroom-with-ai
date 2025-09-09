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

from ..dependencies import get_supabase, get_current_user, get_current_teacher_user, verify_class_membership

router = APIRouter()

class MaterialResponse(BaseModel):
    id: UUID
    class_id: UUID
    topic: str
    filename: str
    file_type: str
    user_id: UUID
    class Config:
        from_attributes = True

@router.get("/{class_id}", response_model=List[MaterialResponse], dependencies=[Depends(verify_class_membership)])
def list_materials(
    class_id: UUID,
    topic: str | None = None,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Lists materials for a specific class. User must be a member of the class."""
    query = sb.table("materials").select("id, class_id, topic, filename, file_type, user_id").eq("class_id", str(class_id))
    if topic:
        query = query.eq("topic", topic)
    
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@router.post("/{class_id}", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_class_membership)])
async def upload_material(
    class_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    topic: str = Form(...),
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Uploads a material file to a specific class. Teacher must be a member of the class."""
    user_id = current_teacher.get("id")
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension not in ['pdf', 'ppt', 'pptx', 'txt']:
        raise HTTPException(status_code=400, detail=f"File type '.{file_extension}' is not supported.")

    try:
        file_content = await file.read()
        storage_path = f"{user_id}/{class_id}/{topic}/{file.filename}"

        sb.storage.from_("materials").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        db_response = sb.table("materials").upsert({
            "class_id": str(class_id),
            "topic": topic,
            "filename": file.filename,
            "mime_type": file.content_type,
            "file_type": file_extension.replace('pptx', 'ppt'),
            "storage_path": storage_path,
            "user_id": str(user_id),
        }, on_conflict="storage_path").execute()

        if not db_response.data:
            raise HTTPException(status_code=500, detail="Failed to save material metadata to the database.")

        material_record = db_response.data[0]
        background_tasks.add_task(process_material_for_rag, material_record['id'], storage_path, sb)

        return {"message": "Material uploaded successfully. Embedding process will run in the background.", "material_id": material_record['id']}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")