from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import supabase
import traceback
from ..dependencies import get_supabase, get_current_user
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()

class ClassCreate(BaseModel):
    class_name: str
    grade: str
    teacher_name: Optional[str] = None

class ClassJoin(BaseModel):
    class_code: str

class ClassResponse(BaseModel):
    id: UUID
    class_name: str
    class_code: str
    grade: str
    teacher_name: Optional[str] = None
    created_at: datetime # Changed from str to datetime
    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    id: UUID
    username: str | None
    email: str
    role: str
    class_name: str

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ClassResponse, summary="Create a new class (Admin only)")
def create_class(
    class_data: ClassCreate,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    if user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and teachers can create classes")

    try:
        new_class = db.table("classes").insert({
            "class_name": class_data.class_name,
            "grade": class_data.grade,
            "created_by": user.get("id"),
            "teacher_name": class_data.teacher_name # Store the input teacher name
        }).execute()

        if not new_class.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create class")

        new_class_data = new_class.data[0]

        # Automatically add the teacher as a member of the class they created
        db.table("class_members").insert({
            "class_id": new_class_data['id'],
            "user_id": user.get("id")
        }).execute()

        # Use the teacher_name provided in the form for this specific class response
        print(f"DEBUG_GEMINI_V1: class_data.teacher_name before assignment: {class_data.teacher_name}") # Debug print
        new_class_data["teacher_name"] = class_data.teacher_name

        print(f"Returning new_class_data: {new_class_data}") # Add this print statement

        return new_class_data

    except Exception as e:
        print(f"Error creating class: {e}")
        traceback.print_exc() # Print full traceback to console
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/join", status_code=status.HTTP_200_OK, summary="Join a class with a code")
def join_class(
    join_data: ClassJoin,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    try:
        class_to_join = db.table("classes").select("id").eq("class_code", join_data.class_code).single().execute()

        if not class_to_join.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class with this code not found")

        class_id = class_to_join.data["id"]
        user_id = user.get("id")

        existing_member = db.table("class_members").select("id").eq("class_id", class_id).eq("user_id", user_id).execute()
        if existing_member.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member of this class")

        new_member = db.table("class_members").insert({
            "class_id": class_id,
            "user_id": user_id
        }).execute()

        if not new_member.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to join class")

        return {"message": "Successfully joined class"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me", response_model=List[ClassResponse], summary="Get all classes for the current user")
def get_my_classes(
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches all classes the current user is a member of."""
    try:
        user_id = user.get("id")
        
        member_of_res = db.table("class_members").select("class_id").eq("user_id", user_id).execute()
        if not member_of_res.data:
            return []
        
        class_ids = [item['class_id'] for item in member_of_res.data]
        
        classes_res = db.table("classes").select("id, class_name, class_code, grade, teacher_name, created_at").in_("id", class_ids).execute()
        
        return classes_res.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/created-by-me", response_model=List[ClassResponse], summary="Get all classes created by the current user (teacher)")
def get_classes_created_by_me(
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches all classes created by the current user."""
    try:
        user_id = user.get("id")
        
        classes_res = db.table("classes").select("id, class_name, class_code, grade, teacher_name, created_at").eq("created_by", user_id).execute()
        
        return classes_res.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import traceback

@router.get("/{class_id}/students", response_model=List[StudentResponse], summary="Get all students in a class")
def get_students_in_class(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches all students enrolled in a specific class."""
    try:
        # Check for authorization
        is_member = db.table("class_members").select("id").eq("class_id", class_id).eq("user_id", user.get("id")).execute()
        is_admin = user.get("role") == "admin"

        if not is_member.data and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view students in this class")

        # Get all user_ids from the class_members table for the given class_id
        # and join with public.users and classes table
        # Get all user_ids from the class_members table for the given class_id
        member_ids_res = db.table("class_members").select("user_id").eq("class_id", class_id).execute()
        if not member_ids_res.data:
            return []

        student_ids = [item['user_id'] for item in member_ids_res.data]

        # Fetch user details from the public.users view
        users_res = db.table("users").select("id, username, email, role").in_("id", student_ids).execute()
        if not users_res.data:
            return []
        users_map = {user["id"]: user for user in users_res.data}

        # Fetch class details
        class_details_res = db.table("classes").select("class_name").eq("id", class_id).single().execute()
        class_name = class_details_res.data["class_name"] if class_details_res.data else "Unknown Class"

        # Combine data, filter for students, and format the response
        formatted_students = []
        for member_id_data in member_ids_res.data:
            user_id = member_id_data["user_id"]
            user_data = users_map.get(user_id)

            if user_data and user_data.get("role") == "student":
                formatted_students.append({
                    "id": user_data.get("id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "role": user_data.get("role"),
                    "class_name": class_name
                })
        
        return formatted_students

    except Exception as e:
        raise HTTPException(status_code=500, detail=traceback.format_exc())