from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from typing import List
from uuid import UUID
from pydantic import BaseModel

from ..dependencies import get_supabase, get_current_teacher_user

router = APIRouter()

class MaterialAccessResponse(BaseModel):
    user_id: UUID
    accessed_at: str
    user_name: str

@router.get("/{material_id}/access", response_model=List[MaterialAccessResponse])
def get_material_access_logs(
    material_id: UUID,
    sb: Client = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
):
    """Retrieves the access logs for a material. Only for teachers."""
    
    # Verify the current user is the teacher of the class for this material
    material_res = sb.table("materials").select("class_id").eq("id", str(material_id)).single().execute()
    if not material_res.data:
        raise HTTPException(status_code=404, detail="Material not found.")
        
    class_id = material_res.data['class_id']
    
    class_res = sb.table("classes").select("created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data or str(class_res.data['created_by']) != str(current_teacher['id']):
        raise HTTPException(status_code=403, detail="You are not authorized to view these access logs.")

    # Fetch access logs from the view
    access_logs_res = sb.table("material_access").select("user_id, accessed_at, profiles(username)").eq("material_id", str(material_id)).execute()
    
    if not access_logs_res.data:
        return []

    # Format the response
    response_data = []
    for log in access_logs_res.data:
        response_data.append({
            "user_id": log['user_id'],
            "accessed_at": log['accessed_at'],
            "user_name": log['profiles']['username'] if log.get('profiles') and log['profiles'].get('username') else 'Unknown User'
        })
        
    return response_data
