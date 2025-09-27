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

def get_current_user(token: str = Depends(oAuth2_scheme), sb_admin: Client =
  Depends(get_supabase_admin)):
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

        response = sb_admin.table("profiles").select("*").eq("id", user_id).execute()
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
    class_id: Optional[UUID] = None,
    quiz_id: Optional[UUID] = None,
    user: dict = Depends(get_current_user),
    sb_admin: Client = Depends(get_supabase_admin),
):
    user_id = user.get("id")
    
    if not class_id and not quiz_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either class_id or quiz_id must be provided.")

    target_class_id = class_id
    if quiz_id:
        # If quiz_id is provided, fetch class_id from the quiz
        quiz_res = sb_admin.table("quizzes").select("class_id").eq("id", str(quiz_id)).single().execute()
        if not quiz_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
        target_class_id = quiz_res.data['class_id']

    if not target_class_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found for the given quiz.")

    try:
        member = sb_admin.table("class_members").select("id").eq("class_id", str(target_class_id)).eq("user_id", user_id).execute().data
        creator = sb_admin.table("classes").select("id").eq("id", str(target_class_id)).eq("created_by", user_id).execute().data

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

def verify_quiz_membership(
    quiz_id: UUID,
    user: dict = Depends(get_current_user),
    sb_admin: Client = Depends(get_supabase_admin),
):
    return verify_class_membership(quiz_id=quiz_id, user=user, sb_admin=sb_admin)
