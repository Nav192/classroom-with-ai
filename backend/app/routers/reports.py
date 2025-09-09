import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from supabase.client import Client as SupabaseClient
from typing import List, Dict

from ..dependencies import get_supabase, get_current_teacher_user # Hanya guru yang bisa membuat laporan

router = APIRouter()

@router.get("/students.csv", summary="Buat laporan belajar siswa komprehensif dalam format CSV")
def generate_student_learning_report_csv(
    sb: SupabaseClient = Depends(get_supabase),
    current_teacher: dict = Depends(get_current_teacher_user), # Amankan untuk guru saja
):
    """
    Membuat laporan CSV komprehensif tentang progres belajar siswa,
    termasuk penyelesaian materi dan hasil kuis.
    """
    try:
        # Ambil data yang diperlukan
        profiles_res = sb.table("profiles").select("id, email, role").eq("role", "student").execute()
        students = profiles_res.data or []

        materials_progress_res = sb.table("materials_progress").select("*").execute()
        materials_progress = materials_progress_res.data or []

        results_res = sb.table("results").select("*").execute()
        results = results_res.data or []

        quizzes_res = sb.table("quizzes").select("id, topic, class_id").execute()
        quizzes = {q['id']: q for q in quizzes_res.data}

        materials_res = sb.table("materials").select("id, topic, class_id").execute()
        materials = {m['id']: m for m in materials_res.data}

        report_data = []

        for student in students:
            student_id = student['id']
            student_email = student['email']

            # Agregasi progres materi untuk siswa ini
            student_materials_progress = [mp for mp in materials_progress if mp['user_id'] == student_id]
            completed_materials_count = len([mp for mp in student_materials_progress if mp['status'] == 'completed'])
            
            # Agregasi hasil kuis untuk siswa ini
            student_results = [r for r in results if r['user_id'] == student_id]
            
            # Dapatkan kuis unik yang diselesaikan oleh siswa ini
            completed_quizzes_ids = set(r['quiz_id'] for r in student_results)
            completed_quizzes_count = len(completed_quizzes_ids)

            # Siapkan baris untuk CSV
            row = {
                "ID Siswa": student_id,
                "Email Siswa": student_email,
                "Materi Selesai": completed_materials_count,
                "Total Materi Dilacak": len(student_materials_progress), # Hanya materi yang berinteraksi dengan mereka
                "Kuis Selesai": completed_quizzes_count,
                "Total Kuis Diambil": len(student_results), # Total percobaan
            }
            
            # Tambahkan skor kuis terbaru untuk setiap kuis yang diambil
            latest_quiz_scores = {}
            for r in sorted(student_results, key=lambda x: x['created_at'], reverse=True):
                quiz_info = quizzes.get(r['quiz_id'])
                if quiz_info:
                    quiz_name = f"{quiz_info['topic']} ({quiz_info['class_id']})"
                    if quiz_name not in latest_quiz_scores: # Hanya simpan skor percobaan terbaru
                        latest_quiz_scores[quiz_name] = f"{r['score']}/{r['total']}"
            
            row.update(latest_quiz_scores)
            report_data.append(row)

        # Buat DataFrame dan ekspor ke CSV
        df = pd.DataFrame(report_data)
        
        # Isi nilai NaN dengan string kosong untuk CSV yang lebih bersih
        df = df.fillna('')

        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0);

        headers = {
            "Content-Disposition": "attachment; filename=laporan_belajar_siswa.csv",
            "Content-Type": "text/csv",
        }
        return StreamingResponse(iter([buf.getvalue()]), headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat laporan: {str(e)}")