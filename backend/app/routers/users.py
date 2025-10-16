from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from uuid import UUID
from supabase import Client

from ..dependencies import get_supabase, get_current_user, get_supabase_admin

router = APIRouter()

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str

@router.get("/{user_id}", response_model=UserResponse, summary="Get a user by ID")
def get_user(user_id: UUID, sb: Client = Depends(get_supabase_admin), current_user: dict = Depends(get_current_user)):
    try:
        response = sb.table("profiles").select("id, email, role, username").eq("id", str(user_id)).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
