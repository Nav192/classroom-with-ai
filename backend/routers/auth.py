from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from supabase_client import supabase

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role_id: int # 1 for admin, 2 for guru, 3 for siswa

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/register", tags=["Auth"])
async def create_user(user: UserCreate):
    try:
        # Step 1: Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="User could not be created in Auth")

        # Step 2: Get the newly created user's ID
        user_id = auth_response.user.id

        # Step 3: Insert user details into the public.profiles table
        profile_response = supabase.table('profiles').insert({
            'id': user_id,
            'full_name': user.full_name,
            'role_id': user.role_id
        }).execute()

        if profile_response.data:
            return {"message": "User created successfully", "user_id": user_id, "profile": profile_response.data}
        else:
            # Optional: Handle case where profile insertion fails
            # For now, we assume it works if auth signup was successful
            raise HTTPException(status_code=400, detail="User profile could not be created")

    except Exception as e:
        # Check for specific Supabase errors if possible, e.g., user already exists
        if 'User already registered' in str(e):
            raise HTTPException(status_code=400, detail="User with this email already exists")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", tags=["Auth"])
async def login_for_access_token(form_data: UserLogin):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": form_data.email, 
            "password": form_data.password
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid credentials: {str(e)}")
