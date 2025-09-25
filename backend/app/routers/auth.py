from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from supabase import Client

from ..dependencies import get_supabase

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


from enum import Enum

class UserRole(str, Enum):
    teacher = "teacher"
    student = "student"
    admin = "admin"

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    role: UserRole


class LoginResponse(BaseModel):
    access_token: str
    user_id: str
    role: str
    username: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, sb: Client = Depends(get_supabase)):
    try:
        res = sb.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
        if res.user is None or res.session is None or res.session.access_token is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get role from our public.profiles table
        profile = sb.table("profiles").select("role, username").eq("id", res.user.id).single().execute()
        if not profile.data or not profile.data.get("role"):
            raise HTTPException(status_code=404, detail="User profile or role not found.")

        user_role = profile.data["role"]
        user_username = profile.data["username"]

        return LoginResponse(access_token=res.session.access_token, user_id=res.user.id, role=user_role, username=user_username)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/register", status_code=status.HTTP_201_CREATED)
def signup(payload: RegisterRequest, sb: Client = Depends(get_supabase)):
    try:
        # The trigger will automatically create the profile
        res = sb.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {"data": {"role": payload.role, "username": payload.username}},
            }
        )
        if res.user is None:
            raise HTTPException(status_code=400, detail="Failed to register user")

        return {"message": "User registered successfully. Please check your email to verify."}
    except Exception as exc:
        import traceback
        print(f"Error during signup: {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Database error saving new user: {exc}")