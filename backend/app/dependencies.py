from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import create_client, Client
from .config import settings
import jwt
from uuid import UUID

oAuth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_supabase() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.supabase_anon_key
    return create_client(url, key)

def get_supabase_admin() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.SUPABASE_SERVICE_KEY
    return create_client(url, key)

def get_current_user(token: str = Depends(oAuth2_scheme), sb: Client = Depends(get_supabase)):
    print(f"Received Token: {token}")
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = sb.table("profiles").select("*").eq("id", user_id).single().execute()
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user.data
    except jwt.PyJWTError as e:
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

def verify_class_membership(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase)
):
    user_id = user.get("id")
    try:
        member = db.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", user_id).single().execute()
        if not member.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this class or the class does not exist."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying class membership: {str(e)}"
        )
    return True
