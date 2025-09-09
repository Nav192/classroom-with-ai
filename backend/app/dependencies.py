from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import create_client, Client
from .config import settings
import jwt

oAuth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_supabase() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.supabase_anon_key
    return create_client(url, key)

def get_current_user(token: str = Depends(oAuth2_scheme), sb: Client = Depends(get_supabase)):
    print(f"Received Token: {token}")
    try:
        # For more security, you'd verify against the public key (JWKS)
        # Supabase JWT secret is base64 encoded and needs to be decoded
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Fetch user profile from your public.profiles table
        user = sb.table("profiles").select("*").eq("id", user_id).single().execute()
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user.data
    except jwt.PyJWTError as e:
        print(f"JWT Decoding Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_teacher_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges for this action"
        )
    return current_user

def get_current_student_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya siswa yang dapat mengakses fitur ini."
        )
    return current_user