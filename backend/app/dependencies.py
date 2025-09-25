from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import create_client, Client
from .config import settings
import jwt
from uuid import UUID
from typing import Optional

oAuth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_supabase(token: Optional[str] = Depends(oAuth2_scheme)) -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.supabase_anon_key
    client = create_client(url, key)
    
    if token:
        client.auth.set_session(access_token=token, refresh_token="")
    
    return client

def get_supabase_admin() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.SUPABASE_SERVICE_KEY
    return create_client(url, key)

def get_current_user(token: str = Depends(oAuth2_scheme), sb: Client = Depends(get_supabase)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        response = sb.table("profiles").select("*").eq("id", user_id).execute()
        if not response.data:
            raise credentials_exception
        
        user_profile = response.data[0]
        return user_profile

    except jwt.PyJWTError:
        raise credentials_exception
    except Exception as e:
        raise credentials_exception

def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_teacher_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["teacher", "admin"]:
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

def verify_class_membership(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    sb_admin: Client = Depends(get_supabase_admin),
):
    user_id = user.get("id")
    try:
        member = sb_admin.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", user_id).execute().data
        creator = sb_admin.table("classes").select("id").eq("id", str(class_id)).eq("created_by", user_id).execute().data

        if not member and not creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member or creator of this class, or the class does not exist."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying class membership: {str(e)}"
        )
    return True
