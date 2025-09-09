import io
import google.generativeai as genai
from supabase import Client
from langchain.text_splitter import RecursiveCharacterTextSplitter
from unstructured.partition.auto import partition # DITAMBAHKAN

from ..config import settings

# Konfigurasi Gemini
try:
    genai.configure(api_key=settings.gemini_api_key)
except Exception as e:
    print(f"Tidak dapat mengkonfigurasi Gemini API key: {e}")


def get_text_from_file(file_content: bytes, mime_type: str) -> str:
    """Mengekstrak teks dari konten byte sebuah file menggunakan unstructured."""
    # Sepenuhnya mengandalkan unstructured untuk mem-parsing berbagai jenis dokumen
    try:
        elements = partition(file=io.BytesIO(file_content), content_type=mime_type)
        return "\n".join([str(el) for el in elements])
    except Exception as e:
        print(f"Error mengekstrak teks dengan unstructured untuk mime_type {mime_type}: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
    """Memecah teks menjadi potongan-potongan yang saling tumpang tindih."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    return text_splitter.split_text(text)


def generate_embeddings(text_chunks: list[str]) -> list[list[float]]:
    """Membuat embeddings untuk daftar potongan teks menggunakan Gemini."""
    if not text_chunks:
        return []
    model = 'models/embedding-004'
    result = genai.embed_content(model=model, content=text_chunks, task_type="retrieval_document")
    return result['embedding']

def process_material_for_rag(material_id: str, storage_path: str, sb: Client):
    """Fungsi utama pipeline RAG untuk dijalankan di background."""
    print(f"Memulai pemrosesan RAG untuk material_id: {material_id}")
    try:
        # 1. Unduh file dari Supabase Storage
        meta_res = sb.table("materials").select("mime_type").eq("id", material_id).single().execute()
        if not meta_res.data:
            print(f"Error: Materi dengan ID {material_id} tidak ditemukan.")
            return
        mime_type = meta_res.data['mime_type']
        
        file_content = sb.storage.from_("materials").download(storage_path)
        if not file_content:
            print(f"Error: Tidak dapat mengunduh file dari {storage_path}")
            return

        # 2. Ekstrak teks
        text = get_text_from_file(file_content, mime_type)
        if not text:
            print(f"Peringatan: Tidak ada teks yang diekstrak dari materi {material_id}.")
            return

        # 3. Pecah teks menjadi chunks
        chunks = chunk_text(text)
        if not chunks:
            print(f"Peringatan: Teks tidak dapat dipecah menjadi chunks untuk materi {material_id}.")
            return

        # 4. Buat embeddings
        embeddings = generate_embeddings(chunks)

        # 5. Simpan ke tabel material_embeddings
        rows_to_insert = [
            {
                "material_id": material_id,
                "chunk_index": i,
                "text": chunk,
                "embedding": embedding,
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        
        sb.table("material_embeddings").insert(rows_to_insert).execute()
        
        print(f"Berhasil memproses dan meng-embed materi {material_id}")

    except Exception as e:
        print(f"Error memproses materi {material_id} untuk RAG: {e}")
