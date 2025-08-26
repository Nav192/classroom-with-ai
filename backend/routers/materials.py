from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from ..supabase_client import supabase
from gotrue.sync import User

router = APIRouter()

# Dependency to get current user
async def get_current_user(token: str = Depends(supabase.auth.get_user)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token

@router.post("/upload", tags=["Materials"])
async def upload_material(
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # Upload file to Supabase Storage
        file_path = f"materials/{current_user.id}/{file.filename}"
        response = supabase.storage.from_("materials").upload(file_path, file.file.read(), {"content-type": file.content_type})

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {response.json()}")

        # Insert metadata into public.materials table
        material_data = {
            "teacher_id": current_user.id,
            "title": title,
            "file_path": file_path,
        }
        insert_response = supabase.table("materials").insert(material_data).execute()

        if insert_response.data:
            return {"message": "Material uploaded successfully", "material": insert_response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to save material metadata.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", tags=["Materials"])
async def list_materials(current_user: User = Depends(get_current_user)):
    try:
        # Fetch materials uploaded by the current user
        response = supabase.table("materials").select("*").eq("teacher_id", current_user.id).execute()

        if response.data:
            return {"materials": response.data}
        else:
            return {"materials": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
