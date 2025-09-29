import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from supabase.client import Client as SupabaseClient
from uuid import UUID

from ..dependencies import get_supabase, get_current_teacher_user, verify_class_membership

router = APIRouter()

@router.get("/{class_id}/students.csv", summary="Generate a student learning report for a specific class in CSV format")
def generate_class_learning_report_csv(
    class_id: UUID,
    student_id: UUID | None = None, # Add optional student_id parameter
    sb: SupabaseClient = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
    is_member: bool = Depends(verify_class_membership)
):
    """
    Generates a comprehensive CSV report on student learning progress for a specific class.
    Only accessible by teachers who are members of the class.
    """
    try:
        # 1. Get all students in the class, or a specific student if student_id is provided
        query = sb.table("class_members").select("profiles(id, username, email, role)").eq("class_id", str(class_id))
        if student_id:
            query = query.eq("profiles.id", str(student_id))
        
        class_members = query.execute().data or []
        students = [member["profiles"] for member in class_members if member.get("profiles") and member["profiles"]["role"] == "student"]
        
        if not students:
            raise HTTPException(status_code=404, detail="No students found in this class or for the given student ID.")
        
        student_id_map = {s['id']: {'username': s['username'], 'email': s['email']} for s in students}
        student_ids = list(student_id_map.keys())

        # 2. Get all materials and quizzes for the class
        materials_in_class = {m['id']: m['topic'] for m in (sb.table("materials").select("id, topic").eq("class_id", str(class_id)).execute().data or [])}
        quizzes_in_class = {q['id']: q['topic'] for q in (sb.table("quizzes").select("id, topic").eq("class_id", str(class_id)).execute().data or [])}

        # 3. Get all relevant progress and result data
        materials_progress_query = sb.table("materials_progress").select("user_id, material_id, status").in_("user_id", student_ids).in_("material_id", list(materials_in_class.keys()))
        quiz_results_query = sb.table("results").select("user_id, quiz_id, score, total, attempt_number").in_("user_id", student_ids).in_("quiz_id", list(quizzes_in_class.keys()))

        materials_progress = materials_progress_query.execute().data or []
        quiz_results = quiz_results_query.execute().data or []

        # 4. Create Material Progress DataFrame
        material_report_data = []
        for progress in materials_progress:
            student_info = student_id_map.get(progress['user_id'])
            material_topic = materials_in_class.get(progress['material_id'])
            if student_info and material_topic:
                material_report_data.append({
                    "Student Username": student_info['username'],
                    "Student Email": student_info['email'],
                    "Material Topic": material_topic,
                    "Status": progress['status'],
                })
        
        material_df = pd.DataFrame(material_report_data)

        # 5. Create Quiz Results DataFrame
        quiz_report_data = []
        for result in quiz_results:
            student_info = student_id_map.get(result['user_id'])
            quiz_topic = quizzes_in_class.get(result['quiz_id'])
            if student_info and quiz_topic:
                percentage = (result["score"] / result["total"]) * 100 if result["total"] > 0 else 0
                quiz_report_data.append({
                    "Student Username": student_info['username'],
                    "Student Email": student_info['email'],
                    "Quiz Topic": quiz_topic,
                    "Attempt Number": result['attempt_number'],
                    "Score": result['score'],
                    "Total": result['total'],
                    "Percentage": round(percentage, 2),
                })

        quiz_df = pd.DataFrame(quiz_report_data)

        # 6. Combine into a single CSV string
        buf = io.StringIO()
        if not material_df.empty:
            buf.write("Material Progress\n")
            material_df.to_csv(buf, index=False)
            buf.write("\n\n")
        
        if not quiz_df.empty:
            buf.write("Quiz Results\n")
            quiz_df.to_csv(buf, index=False)

        if buf.tell() == 0:
            buf.write("No data available for this report.")

        buf.seek(0)

        headers = {
            "Content-Disposition": f"attachment; filename=laporan_kelas_{class_id}.csv",
            "Content-Type": "text/csv",
        }
        return StreamingResponse(iter([buf.getvalue()]), headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat laporan: {str(e)}")
