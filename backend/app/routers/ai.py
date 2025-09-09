import google.generativeai as genai
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from typing import List, Dict, Literal

from ..dependencies import get_supabase, get_current_student_user, get_current_teacher_user
from ..config import settings

# Konfigurasi Gemini
try:
    genai.configure(api_key=settings.gemini_api_key)
except Exception as e:
    print(f"Tidak dapat mengkonfigurasi Gemini API key: {e}")

router = APIRouter()

# --- Models ---
class ChatRequest(BaseModel):
    query: str
class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict]

class GenerateQuizRequest(BaseModel):
    topic: str
    class_id: str
    question_type: Literal['mcq', 'true_false', 'essay']
    num_questions: int = 5

class GeneratedQuestion(BaseModel):
    text: str
    type: str
    options: List[str] | None = None
    answer: str

class GenerateQuizResponse(BaseModel):
    questions: List[GeneratedQuestion]

# --- Endpoints ---
@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, sb: Client = Depends(get_supabase), current_student: dict = Depends(get_current_student_user)):
    # ... (kode chat yang sudah ada tetap sama)
    user_id = current_student.get("id")
    query = payload.query
    try:
        query_embedding = genai.embed_content(model='models/embedding-004', content=query, task_type="retrieval_query")['embedding']
        relevant_chunks = sb.rpc("match_material_chunks", {"query_embedding": query_embedding, "match_threshold": 0.75, "match_count": 5}).execute().data
        if not relevant_chunks:
            return ChatResponse(answer="Maaf, saya tidak dapat menemukan informasi yang relevan di materi yang ada.", sources=[])
        context_str = "\n---\n".join([chunk['text'] for chunk in relevant_chunks])
        prompt = f"""Anda adalah asisten belajar AI. Jawab pertanyaan siswa hanya berdasarkan konteks materi yang diberikan. Jika jawaban tidak ada dalam konteks, katakan 'Maaf, saya tidak dapat menemukan jawaban untuk pertanyaan itu dalam materi yang diberikan.'\n\nKonteks Materi:\n{context_str}\n\nPertanyaan Siswa: {query}\n\nJawaban:"""
        model = genai.GenerativeModel('gemini-pro')
        ai_response = model.generate_content(prompt)
        answer = ai_response.text
        sb.table("ai_interactions").insert({"user_id": user_id, "prompt": query, "response": answer}).execute()
        sources = [{"material_id": chunk['material_id'], "text": chunk['text']} for chunk in relevant_chunks]
        return ChatResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pada layanan AI: {str(e)}")

@router.post("/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz(payload: GenerateQuizRequest, sb: Client = Depends(get_supabase), current_teacher: dict = Depends(get_current_teacher_user)):
    """Membuat soal kuis berdasarkan materi yang ada untuk topik tertentu."""
    try:
        materials_res = sb.table("materials").select("id").eq("class_id", payload.class_id).eq("topic", payload.topic).execute()
        if not materials_res.data:
            raise HTTPException(status_code=404, detail=f"Tidak ada materi untuk topik '{payload.topic}' di kelas '{payload.class_id}'.")
        
        material_ids = [m['id'] for m in materials_res.data]
        chunks_res = sb.table("material_embeddings").select("text").in_("material_id", material_ids).execute()
        if not chunks_res.data:
            raise HTTPException(status_code=404, detail="Tidak ada konten teks dari materi terpilih untuk dibuatkan kuis.")

        context = "\n".join([chunk['text'] for chunk in chunks_res.data])
        prompt = f"""Anda adalah AI pembuat soal. Berdasarkan HANYA pada konteks di bawah, buatlah {payload.num_questions} soal kuis tipe '{payload.question_type}'.
        Konteks: --- {context[:8000]} ---
        Instruksi Format: Kembalikan HANYA sebuah array JSON valid. Setiap objek harus memiliki properti: \"text\" (string), \"type\" (string, isi dengan '{payload.question_type}'), \"options\" (array of strings, HANYA untuk 'mcq' atau 'true_false'), dan \"answer\" (string). Untuk 'mcq', berikan 4 pilihan. Untuk 'true_false', options harus [\"True\", \"False\"] . Untuk 'essay', 'options' tidak perlu ada. Pastikan 'answer' adalah salah satu dari 'options'."""

        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        
        try:
            questions = json.loads(cleaned_response)
            if not isinstance(questions, list) or not all("text" in q and "answer" in q for q in questions):
                raise ValueError("Respons AI bukan daftar pertanyaan yang valid.")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=500, detail="Gagal mem-parsing respons dari AI. Coba lagi.")

        return GenerateQuizResponse(questions=questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pada layanan AI: {str(e)}")
