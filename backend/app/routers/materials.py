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

from ..dependencies import get_supabase, get_supabase_admin, get_current_user, get_current_teacher_user, verify_class_membership

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

@router.get("/class/{class_id}", response_model=List[MaterialResponse])
def list_materials_for_class(
    class_id: UUID,
    sb: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Lists all materials for a specific class. User must be a member of the class."""
    # First, verify membership
    member_res = sb.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", current_user['id']).execute()
    if not member_res.data:
        raise HTTPException(status_code=403, detail="You are not a member of this class.")

    query = sb.table("materials").select("id, class_id, topic, filename, file_type, user_id").eq("class_id", str(class_id))
    response = query.order("created_at", desc=True).execute()
    return response.data or []

@router.post("/{class_id}", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_class_membership)])
async def upload_material(
    class_id: UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    topic: str = Form(...),
    sb_admin: Client = Depends(get_supabase_admin),
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

        # 1. Upload file to Storage using admin client to bypass RLS
        sb_admin.storage.from_("materials").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        # 2. Call the database function via RPC using admin client
        params = {
            "p_class_id": str(class_id),
            "p_topic": topic,
            "p_filename": file.filename,
            "p_mime_type": file.content_type,
            "p_file_type": file_extension.replace('pptx', 'ppt'),
            "p_storage_path": storage_path,
            "p_user_id": str(user_id),
        }
        db_response = sb_admin.rpc("handle_material_upload", params).execute()

        if not db_response.data:
            # If the RPC call fails, we should consider removing the orphaned file from storage
            sb_admin.storage.from_("materials").remove([storage_path])
            raise HTTPException(status_code=500, detail="Failed to save material metadata via RPC.")

        material_record = db_response.data[0]
        material_id = material_record['material_id']

        return {"message": "Material uploaded successfully via RPC.", "material_id": material_id}

    except Exception as e:
        # Force print the error to the terminal for debugging
        print(f"CAUGHT EXCEPTION: {e}")
        print(f"EXCEPTION TYPE: {type(e)}")
        # This will catch the 'RAISE EXCEPTION' from our PostgreSQL function
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/download/{material_id}", response_model=dict)
async def download_material(
    material_id: UUID,
    sb_admin: Client = Depends(get_supabase_admin),
    current_user: dict = Depends(get_current_user),
):
    """Generates a signed URL for downloading a material file."""
    # 1. Fetch material details using admin client
    material_res = sb_admin.table("materials").select("class_id, storage_path, user_id").eq("id", str(material_id)).single().execute()
    if not material_res.data:
        raise HTTPException(status_code=404, detail="Material not found.")

    material = material_res.data
    class_id = material.get("class_id")
    storage_path = material.get("storage_path")
    uploader_id = material.get("user_id")
    user_id = current_user.get("id")

    if not storage_path:
        raise HTTPException(status_code=404, detail="File path not found for this material.")

    # 2. Verify user is a member of the class OR the original uploader (using admin client)
    if str(user_id) != str(uploader_id):
        member_res = sb_admin.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", str(user_id)).single().execute()
        if not member_res.data:
            raise HTTPException(status_code=403, detail="You are not authorized to download this material.")

    # 3. Generate signed URL (valid for 60 seconds) using admin client
    try:
        signed_url_res = sb_admin.storage.from_("materials").create_signed_url(storage_path, 60)
        return {"download_url": signed_url_res['signedURL']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate download link: {str(e)}")

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: UUID,
    sb_admin: Client = Depends(get_supabase_admin),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Deletes a material, including its file from storage. Only accessible by teachers."""
    user_id = current_teacher.get("id")

    # 1. Fetch material to get storage_path and verify ownership
    material_res = sb_admin.table("materials").select("storage_path, user_id").eq("id", str(material_id)).single().execute()
    if not material_res.data:
        raise HTTPException(status_code=404, detail="Material not found.")

    material = material_res.data
    # Optional: Add a check to ensure only the user who uploaded it can delete it.
    # if str(material.get('user_id')) != str(user_id):
    #     raise HTTPException(status_code=403, detail="You are not authorized to delete this material.")

    # 2. Delete the file from storage
    storage_path = material.get("storage_path")
    if storage_path:
        try:
            sb_admin.storage.from_("materials").remove([storage_path])
        except Exception as e:
            # Log the error but proceed to delete the DB record anyway
            print(f"Error deleting file from storage: {e}")

    # 3. Delete the material record from the database
    delete_res = sb_admin.table("materials").delete().eq("id", str(material_id)).execute()
    if not delete_res.data:
        raise HTTPException(status_code=500, detail="Failed to delete material from database.")

    return