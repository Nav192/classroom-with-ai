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
    sb: SupabaseClient = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user),
    is_member: bool = Depends(verify_class_membership)
):
    """
    Generates a comprehensive CSV report on student learning progress for a specific class.
    Only accessible by teachers who are members of the class.
    """
    try:
        # 1. Get all students in the class
        class_members = sb.table("class_members").select("user_id").eq("class_id", str(class_id)).execute().data or []
        student_ids = [member['user_id'] for member in class_members]
        if not student_ids:
            raise HTTPException(status_code=404, detail="No students found in this class.")

        student_profiles = sb.table("profiles").select("id, email, role").in_("id", student_ids).eq("role", "student").execute().data or []
        student_id_map = {p['id']: p['email'] for p in student_profiles}

        # 2. Get all materials and quizzes for the class
        materials_in_class = sb.table("materials").select("id, topic").eq("class_id", str(class_id)).execute().data or []
        material_ids_in_class = [m['id'] for m in materials_in_class]

        quizzes_in_class = sb.table("quizzes").select("id, topic").eq("class_id", str(class_id)).execute().data or []
        quiz_id_map = {q['id']: q['topic'] for q in quizzes_in_class}

        # 3. Get all relevant progress and result data
        materials_progress = sb.table("materials_progress").select("user_id, material_id, status").in_("user_id", list(student_id_map.keys())).in_("material_id", material_ids_in_class).execute().data or []
        quiz_results = sb.table("results").select("user_id, quiz_id, score, total, created_at").in_("user_id", list(student_id_map.keys())).in_("quiz_id", list(quiz_id_map.keys())).execute().data or []

        report_data = []
        for student_id, student_email in student_id_map.items():
            # Aggregate material progress for this student
            student_materials_completed = len([mp for mp in materials_progress if mp['user_id'] == student_id and mp['status'] == 'completed'])
            
            # Aggregate quiz results for this student
            student_quiz_results = [r for r in quiz_results if r['user_id'] == student_id]
            completed_quizzes_count = len(set(r['quiz_id'] for r in student_quiz_results))

            row = {
                "ID Siswa": student_id,
                "Email Siswa": student_email,
                "Materi Selesai": student_materials_completed,
                "Total Materi di Kelas": len(materials_in_class),
                "Kuis Dikerjakan (unik)": completed_quizzes_count,
                "Total Kuis di Kelas": len(quizzes_in_class),
            }

            # Add latest score for each quiz taken
            latest_scores = {}
            for r in sorted(student_quiz_results, key=lambda x: x['created_at'], reverse=True):
                quiz_topic = quiz_id_map.get(r['quiz_id'])
                if quiz_topic and quiz_topic not in latest_scores:
                    latest_scores[quiz_topic] = f"{r['score']}/{r['total']}"
            
            row.update(latest_scores)
            report_data.append(row)

        if not report_data:
            df = pd.DataFrame(columns=["ID Siswa", "Email Siswa", "Info"]).append([{"Info": "Tidak ada data progres siswa untuk dilaporkan di kelas ini."}])
        else:
            df = pd.DataFrame(report_data).fillna("")

        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)

        headers = {
            "Content-Disposition": f"attachment; filename=laporan_kelas_{class_id}.csv",
            "Content-Type": "text/csv",
        }
        return StreamingResponse(iter([buf.getvalue()]), headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat laporan: {str(e)}")
