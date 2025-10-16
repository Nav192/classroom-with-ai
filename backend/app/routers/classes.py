from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import supabase
from ..dependencies import get_supabase, get_supabase_admin, get_current_user
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()

class ClassCreate(BaseModel):
    class_name: str
    grade: str

class ClassJoin(BaseModel):
    class_code: str

class ClassResponse(BaseModel):
    id: UUID
    class_name: str
    class_code: str
    grade: str
    teacher_name: Optional[str] = None
    created_at: datetime # Changed from str to datetime
    is_archived: bool = False
    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    id: UUID
    username: str | None
    email: str
    role: str
    class_name: str


class ClassDetailsResponse(BaseModel):
    id: UUID
    class_name: str
    grade: str
    teacher_name: Optional[str] = None
    class_code: str

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ClassResponse, summary="Create a new class (Admin only)")
def create_class(
    class_data: ClassCreate,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    print("DEBUG: create_class function entered.")
    if user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and teachers can create classes")

    try:
        # Generate a unique 6-character alphanumeric class code
        import random
        import string
        while True:
            class_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            # Check if the generated code already exists
            existing_class = db.table("classes").select("id").eq("class_code", class_code).execute().data
            if not existing_class:
                break

        # Fetch the teacher's username from the profiles table
        teacher_profile = db.table("profiles").select("username").eq("id", user.get("id")).single().execute().data
        teacher_username = teacher_profile["username"] if teacher_profile else "Unknown Teacher"

        new_class = db.table("classes").insert({
            "class_name": class_data.class_name,
            "grade": class_data.grade,
            "created_by": user.get("id"),
            "teacher_name": teacher_username,
            "class_code": class_code
        }, returning="representation").execute()

        if not new_class.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create class: No data returned from insert")

        new_class_data = new_class.data[0]

        # Automatically add the teacher as a member of the class they created
        db.table("class_members").upsert({
            "class_id": new_class_data['id'],
            "user_id": user.get("id")
        }, on_conflict="class_id,user_id").execute()
        print(f"DEBUG: class_members upserted for class_id: {new_class_data['id']} and user_id: {user.get('id')}")

        # Use the teacher_name provided in the form for this specific class response


        print(f"Returning new_class_data: {new_class_data}")

        return new_class_data

    except Exception as e:
        print(f"Error creating class: {e}")
        import traceback
        print(traceback.format_exc()) # Print full traceback to console
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

        new_member = db.table("class_members").upsert({
            "class_id": class_id,
            "user_id": user_id
        }, on_conflict="class_id,user_id").execute()
        print(f"DEBUG: join_class - upsert result: {new_member.data}")

        if not new_member.data:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to join class")

        return {"message": "Successfully joined class"}
    except Exception as e:
        print(f"Error joining class: {e}")
        traceback.print_exc() # Print full traceback to console
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{class_id}/archive", status_code=status.HTTP_200_OK, response_model=ClassResponse, summary="Archive a class")
def archive_class(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    """Archives a class. Only the user who created the class can archive it."""
    user_id = user.get("id")
    
    # Verify the user is the creator of the class
    class_res = db.table("classes").select("id, created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if str(class_res.data["created_by"]) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the class creator can archive it.")

    # Update the is_archived flag to True
    updated_class_res = db.table("classes").update({"is_archived": True}).eq("id", str(class_id)).execute()
    if not updated_class_res.data:
        raise HTTPException(status_code=500, detail="Failed to archive class.")
        
    return updated_class_res.data[0]


@router.patch("/{class_id}/unarchive", status_code=status.HTTP_200_OK, response_model=ClassResponse, summary="Unarchive a class")
def unarchive_class(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    """Unarchives a class. Only the user who created the class can unarchive it."""
    user_id = user.get("id")
    
    # Verify the user is the creator of the class
    class_res = db.table("classes").select("id, created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if str(class_res.data["created_by"]) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the class creator can unarchive it.")

    # Update the is_archived flag to False
    updated_class_res = db.table("classes").update({"is_archived": False}).eq("id", str(class_id)).execute()
    return updated_class_res.data[0]

@router.patch("/{class_id}/reset-code", status_code=status.HTTP_200_OK, response_model=ClassResponse, summary="Reset a class code")
def reset_class_code(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    """Generates a new, unique 6-character alphanumeric code for a class. Only the user who created the class can reset its code."""
    user_id = user.get("id")
    
    # Verify the user is the creator of the class
    class_res = db.table("classes").select("id, created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if str(class_res.data["created_by"]) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the class creator can reset its code.")

    try:
        # Generate a unique 6-character alphanumeric class code
        import random
        import string
        while True:
            new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            # Check if the generated code already exists
            check = db.table("classes").select("id").eq("class_code", new_code).execute()
            if not check.data:
                break
        
        # Update the class_code
        update_res = db.table("classes").update({"class_code": new_code}).eq("id", str(class_id)).execute()
        
        # Fetch the updated class data
        updated_class_res = db.table("classes").select("*").eq("id", str(class_id)).single().execute()
        if not updated_class_res.data:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated class data.")

        return updated_class_res.data

    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print(f"Error resetting class code: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me", response_model=List[ClassResponse], summary="Get all classes for the current user")
def get_my_classes(
    show_archived: bool = False,
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
        
        query = db.table("classes").select("id, class_name, class_code, grade, teacher_name, created_at, is_archived").in_("id", class_ids)

        if not show_archived:
            query = query.eq("is_archived", False)

        classes_res = query.order("created_at", desc=True).execute()
        
        return classes_res.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/created-by-me", response_model=List[ClassResponse], summary="Get all classes created by the current user (teacher)")
def get_classes_created_by_me(
    show_archived: bool = False,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches all classes created by the current user."""
    try:
        user_id = user.get("id")
        print(f"DEBUG: get_classes_created_by_me - User ID: {user_id}")
        
        query = db.table("classes").select("id, class_name, class_code, grade, teacher_name, created_at, is_archived").eq("created_by", user_id)

        if not show_archived:
            query = query.eq("is_archived", False)

        classes_res = query.order("created_at", desc=True).execute()
        print(f"DEBUG: get_classes_created_by_me - Supabase Response Data: {classes_res.data}")
        
        return classes_res.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import traceback

@router.get("/{class_id}", response_model=ClassDetailsResponse, summary="Get details for a specific class")
def get_class_details(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches details for a single class, provided the user is the creator or a member."""
    user_id = user.get("id")
    
    # First, check if the user is the creator of the class
    is_class_creator_res = db.table("classes").select("id").eq("created_by", user_id).eq("id", str(class_id)).single().execute()

    # If not the creator, check if they are a member
    if not is_class_creator_res.data:
        is_member_res = db.table("class_members").select("class_id").eq("user_id", user_id).eq("class_id", str(class_id)).single().execute()
        if not is_member_res.data:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this class.")

    # If authorized, fetch class details
    class_res = db.table("classes").select("id, class_name, grade, teacher_name, class_code").eq("id", str(class_id)).single().execute()
    if not class_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
        
    return class_res.data


@router.post("/{class_id}/request-leave", status_code=status.HTTP_200_OK, summary="Request to leave a class")
def request_leave_class(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    """Allows the current user (student) to request to leave a class."""
    user_id = user.get("id")

    try:
        # Verify the user is a member of the class and not already pending
        membership_res = db.table("class_members").select("id, status").eq("class_id", str(class_id)).eq("user_id", user_id).single().execute()
        if not membership_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not a member of this class.")
        
        if membership_res.data.get('status') == 'pending_leave':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already requested to leave this class.")

        # Update the membership status to 'pending_leave'
        db.table("class_members").update({"status": "pending_leave"}).eq("class_id", str(class_id)).eq("user_id", user_id).execute()
        
        return {"message": "Your request to leave the class has been sent for approval."}
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        print(f"Error leaving class: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


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

        # Fetch user details from the public.profiles table
        users_res = db.table("profiles").select("id, username, email, role").in_("id", student_ids).execute()
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

class LeaveRequestAction(BaseModel):
    student_id: UUID
    action: str # "approve" or "deny"

@router.get("/{class_id}/leave-requests", response_model=List[StudentResponse], summary="Get pending leave requests for a class (Teacher only)")
def get_leave_requests(
    class_id: UUID,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """Fetches all students with a 'pending_leave' status for a specific class."""
    user_id = user.get("id")

    # Verify the user is the creator of the class
    class_res = db.table("classes").select("id, created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data or str(class_res.data["created_by"]) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the class creator can view leave requests.")

    # Get pending members
    pending_members_res = db.table("class_members").select("user_id").eq("class_id", str(class_id)).eq("status", "pending_leave").execute()
    if not pending_members_res.data:
        return []

    student_ids = [item['user_id'] for item in pending_members_res.data]

    # Fetch user details
    users_res = db.table("profiles").select("id, username, email, role").in_("id", student_ids).execute()
    if not users_res.data:
        return []
    
    class_details_res = db.table("classes").select("class_name").eq("id", class_id).single().execute()
    class_name = class_details_res.data["class_name"] if class_details_res.data else "Unknown Class"

    # Format response
    formatted_students = [{
        "id": student["id"],
        "username": student.get("username"),
        "email": student["email"],
        "role": student["role"],
        "class_name": class_name
    } for student in users_res.data]

    return formatted_students

@router.post("/{class_id}/handle-leave-request", status_code=status.HTTP_200_OK, summary="Handle a student's leave request (Teacher only)")
def handle_leave_request(
    class_id: UUID,
    request_action: LeaveRequestAction,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase_admin)
):
    """Approves or denies a student's request to leave a class."""
    user_id = user.get("id")

    # Verify the user is the creator of the class
    class_res = db.table("classes").select("id, created_by").eq("id", str(class_id)).single().execute()
    if not class_res.data or str(class_res.data["created_by"]) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the class creator can handle leave requests.")

    student_id = str(request_action.student_id)
    action = request_action.action

    # Verify the student is actually pending leave
    membership_res = db.table("class_members").select("id").eq("class_id", str(class_id)).eq("user_id", student_id).eq("status", "pending_leave").single().execute()
    if not membership_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending leave request found for this student in this class.")

    if action == "approve":
        # Delete the membership entry
        db.table("class_members").delete().eq("class_id", str(class_id)).eq("user_id", student_id).execute()
        return {"message": "Leave request approved. Student has been removed from the class."}
    elif action == "deny":
        # Update status back to "enrolled"
        db.table("class_members").update({"status": "enrolled"}).eq("class_id", str(class_id)).eq("user_id", student_id).execute()
        return {"message": "Leave request denied. Student remains in the class."}
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Must be 'approve' or 'deny'.")

@router.get("/{class_id}/quiz-weights", summary="Get total quiz weight for a class")
def get_class_quiz_weights(
    class_id: UUID,
    exclude_quiz_id: Optional[UUID] = None,
    user: dict = Depends(get_current_user),
    db: supabase.client.Client = Depends(get_supabase)
):
    """
    Calculates the sum of weights of all quizzes in a class.
    Optionally excludes a specific quiz from the calculation.
    """
    # Authorization check: Ensure user is a member of the class
    member_res = db.table("class_members").select("user_id").eq("class_id", str(class_id)).eq("user_id", user.get("id")).execute()
    if not member_res.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this class.")

    query = db.table("quizzes").select("weight").eq("class_id", str(class_id))
    
    if exclude_quiz_id:
        query = query.not_.eq("id", str(exclude_quiz_id))
        
    quizzes_res = query.execute()
    
    total_weight = sum(q['weight'] for q in quizzes_res.data if q.get('weight') is not None)
    
    return {"total_weight": total_weight}
