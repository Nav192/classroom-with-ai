from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List
from uuid import UUID
from supabase import Client
from gotrue.errors import AuthApiError

from ..dependencies import get_supabase, get_current_admin_user

router = APIRouter(
    # prefix="/admin", # This is handled in the main router
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)]
)

# --- Pydantic Models ---
class UserResponse(BaseModel):
    id: UUID
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

# --- Endpoints ---

@router.get("/users", response_model=List[UserResponse])
def list_users(sb: Client = Depends(get_supabase)):
    """Mengambil daftar semua pengguna."""
    try:
        response = sb.table("profiles").select("id, email, role").execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, sb: Client = Depends(get_supabase)):
    """Membuat pengguna baru. Hanya Admin."""
    try:
        res = sb.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True, # Langsung konfirmasi email
            "user_metadata": {"role": user_data.role}
        })
        new_user = res.user
        if not new_user:
            raise HTTPException(status_code=400, detail="Gagal membuat pengguna di Supabase Auth.")

        profile_res = sb.table("profiles").select("*").eq("id", new_user.id).single().execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Profil pengguna tidak dibuat di database.")

        return profile_res.data
    except AuthApiError as e:
        raise HTTPException(status_code=e.status, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, user_data: UserUpdate, sb: Client = Depends(get_supabase)):
    """Memperbarui peran atau email pengguna."""
    try:
        if user_data.role:
            sb.table("profiles").update({"role": user_data.role}).eq("id", user_id).execute()

        if user_data.email:
            sb.auth.admin.update_user_by_id(user_id, {"email": user_data.email})

        updated_profile = sb.table("profiles").select("*").eq("id", user_id).single().execute()
        if not updated_profile.data:
            raise HTTPException(status_code=404, detail="Tidak bisa mengambil profil pengguna yang telah diperbarui.")

        return updated_profile.data
    except AuthApiError as e:
        raise HTTPException(status_code=e.status, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, sb: Client = Depends(get_supabase)):
    """
    Menghapus pengguna secara permanen dari sistem. Aksi ini tidak bisa dibatalkan.
    """
    try:
        sb.auth.admin.delete_user(user_id)
        return
    except AuthApiError as e:
        if "User not found" in e.message:
             raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")
        raise HTTPException(status_code=e.status, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))