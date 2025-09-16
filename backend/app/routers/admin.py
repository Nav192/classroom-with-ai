from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List
from uuid import UUID
from supabase import Client
from gotrue.errors import AuthApiError
import random
import string

from ..dependencies import get_current_admin_user, get_supabase_admin

router = APIRouter(
    dependencies=[Depends(get_current_admin_user)]
)

# --- Pydantic Models ---
class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: str | None = None

class ClassAdminResponse(BaseModel):
    id: UUID
    class_name: str
    class_code: str
    created_at: str
    created_by: UUID | None
    class Config:
        from_attributes = True

# --- User Management Endpoints ---

@router.get("/users", response_model=List[UserResponse], summary="List all users")
def list_users(sb: Client = Depends(get_supabase_admin)):
    try:
        response = sb.table("profiles").select("id, email, role, username").execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create a new user")
def create_user(user_data: UserCreate, sb: Client = Depends(get_supabase_admin)):
    try:
        res = sb.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": {"role": user_data.role}
        })
        new_user = res.user
        if not new_user:
            raise HTTPException(status_code=400, detail="Failed to create user in Supabase Auth.")
        profile_res = sb.table("profiles").select("*").eq("id", new_user.id).single().execute()
        return profile_res.data
    except AuthApiError as e:
        raise HTTPException(status_code=e.status, detail=e.message)

@router.put("/users/{user_id}", response_model=UserResponse, summary="Update a user's role or email")
def update_user(user_id: UUID, user_data: UserUpdate, sb: Client = Depends(get_supabase_admin)):
    try:
        auth_updates = {}
        if user_data.email:
            auth_updates["email"] = user_data.email
        if user_data.role:
            auth_updates["user_metadata"] = {"role": user_data.role}

        # Update Supabase Auth first (source of truth)
        if auth_updates:
            sb.auth.admin.update_user_by_id(str(user_id), auth_updates)

        # Then, update the local profiles table to match
        if user_data.role:
            sb.table("profiles").update({"role": user_data.role}).eq("id", str(user_id)).execute()
        if user_data.email:
            sb.table("profiles").update({"email": user_data.email}).eq("id", str(user_id)).execute()

        updated_profile = sb.table("profiles").select("*").eq("id", str(user_id)).single().execute()
        return updated_profile.data
    except AuthApiError as e:
        raise HTTPException(status_code=e.status, detail=e.message)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Permanently delete a user")
def delete_user(user_id: UUID, sb: Client = Depends(get_supabase_admin)):
    try:
        # Must convert to string for the library
        sb.auth.admin.delete_user(str(user_id))
    except AuthApiError as e:
        if "User not found" in e.message:
             raise HTTPException(status_code=404, detail="User not found.")
        raise HTTPException(status_code=e.status, detail=e.message)

# --- Class Management Endpoints ---

@router.get("/classes", response_model=List[ClassAdminResponse], summary="List all classes")
def list_all_classes(sb: Client = Depends(get_supabase_admin)):
    try:
        response = sb.table("classes").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/classes/{class_id}/reset-code", response_model=ClassAdminResponse, summary="Reset a class code")
def reset_class_code(class_id: UUID, sb: Client = Depends(get_supabase_admin)):
    """Generates a new, unique 6-character alphanumeric code for a class."""
    try:
        while True:
            new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            check = sb.table("classes").select("id").eq("class_code", new_code).execute()
            if not check.data:
                break
        
        response = sb.table("classes").update({"class_code": new_code}).eq("id", str(class_id)).select("*").single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Class not found.")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a class")
def delete_class(class_id: UUID, sb: Client = Depends(get_supabase_admin)):
    """Permanently deletes a class and all its associated data (members, materials, quizzes, etc.) via cascading deletes."""
    try:
        sb.table("classes").delete().eq("id", str(class_id)).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))