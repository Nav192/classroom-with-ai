import io
import httpx # New import for making HTTP requests
import google.generativeai as genai # Keep for process_material_for_rag if still used
from supabase import Client # Keep for process_material_for_rag if still used
from langchain.text_splitter import RecursiveCharacterTextSplitter
from unstructured.partition.auto import partition
from typing import List
from pdf2image import convert_from_bytes
from PIL import Image
import base64

from ..config import settings
from backend.supabase_client import supabase # Keep for process_material_for_rag if still used

# Konfigurasi Gemini (only if process_material_for_rag still uses it)
try:
    genai.configure(api_key=settings.gemini_api_key)
except Exception as e:
    print(f"Tidak dapat mengkonfigurasi Gemini API key: {e}")

# Remove chat_model and embeddingModel initialization as they are now in Edge Function
# Remove generate_query_embedding as it's now in Edge Function

def get_text_from_file(file_content: bytes, mime_type: str) -> str:
    """Mengekstrak teks dari konten byte sebuah file menggunakan unstructured."""
    try:
        elements = partition(file=io.BytesIO(file_content), content_type=mime_type, languages=['id']) # Added languages=['id']
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
    model = 'models/text-embedding-004' # Changed model name
    result = genai.embed_content(model=model, content=text_chunks, task_type="retrieval_document")
    return result['embedding']

async def process_material_for_rag(material_id: str, storage_path: str, sb: Client):
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
        all_extracted_text_parts = []

        # Try to extract text using unstructured first
        unstructured_text = get_text_from_file(file_content, mime_type)
        if unstructured_text:
            all_extracted_text_parts.append(unstructured_text)

        # If it's a PDF, also try to extract text from images via OCR Edge Function
        if mime_type == "application/pdf":
            try:
                # Convert PDF bytes to images
                images = convert_from_bytes(file_content)
                ocr_edge_function_url = f"{settings.supabase_url}/functions/v1/ocr-pdf-image"

                for i, image in enumerate(images):
                    # Convert PIL Image to bytes (PNG format)
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='PNG')
                    img_bytes = img_byte_arr.getvalue()

                    # Base64 encode the image
                    encoded_image = base64.b64encode(img_bytes).decode('utf-8')

                    # Call the OCR Edge Function
                    ocr_payload = {"image_base64": encoded_image}
                    ocr_headers = {"Content-Type": "application/json"}

                    async with httpx.AsyncClient(timeout=60.0) as client:
                        ocr_response = await client.post(ocr_edge_function_url, headers=ocr_headers, json=ocr_payload)
                        ocr_response.raise_for_status()
                        ocr_result = ocr_response.json()

                        if "extracted_text" in ocr_result and ocr_result["extracted_text"]:
                            all_extracted_text_parts.append(ocr_result["extracted_text"])
                            print(f"OCR successful for page {i+1} of material {material_id}")
                        else:
                            print(f"OCR returned no text for page {i+1} of material {material_id}")

            except httpx.HTTPStatusError as e:
                print(f"HTTP Error calling OCR Edge Function for material {material_id}: Status {e.response.status_code}")
                print(f"Response body: {e.response.text}")
                print(f"Full exception: {e}")
            except httpx.RequestError as e:
                print(f"Request Error calling OCR Edge Function for material {material_id}: {e}")
                import traceback
                traceback.print_exc()
            except Exception as e:
                print(f"Generic Error during PDF image processing or OCR for material {material_id}: {e}")
                import traceback
                traceback.print_exc() # Print full traceback
            # Continue even if image OCR fails, using whatever text was extracted by unstructured

        text = "\n".join(all_extracted_text_parts)

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

class RAGService:
    async def get_ai_response_for_class(self, user_id: str, class_id: str, question: str) -> str:
        try:
            # Construct the URL for the Supabase Edge Function
            # This assumes the Edge Function is deployed and accessible
            # The URL format is typically: https://<project-ref>.supabase.co/functions/v1/<function-name>
            # We need to get SUPABASE_URL from settings and append the function path.
            edge_function_url = f"{settings.supabase_url}/functions/v1/ai-chat"

            headers = {
                "Content-Type": "application/json",
                # Pass the Authorization header from the incoming request if available
                # This assumes the FastAPI endpoint receives the user's JWT
                "Authorization": f"Bearer {user_id}" # user_id here is actually the JWT token
            }
            payload = {
                "class_id": class_id,
                "question": question
            }

            print(f"DEBUG: Sending Authorization header to Edge Function: {headers['Authorization']}") # DEBUG PRINT

            async with httpx.AsyncClient() as client:
                response = await client.post(edge_function_url, headers=headers, json=payload)
                response.raise_for_status() # Raise an exception for 4xx/5xx responses

                edge_function_response = response.json()
                
                if "response" in edge_function_response:
                    return edge_function_response["response"]
                elif "error" in edge_function_response:
                    print(f"Error from Edge Function: {edge_function_response['error']}")
                    return f"Maaf, terjadi kesalahan pada AI Assistant: {edge_function_response['error']}"
                else:
                    return "Maaf, terjadi kesalahan yang tidak diketahui dari AI Assistant."

        except httpx.HTTPStatusError as e:
            print(f"HTTP error calling Edge Function: {e.response.status_code} - {e.response.text}")
            return f"Maaf, terjadi kesalahan saat menghubungi AI Assistant (Kode: {e.response.status_code})."
        except httpx.RequestError as e:
            print(f"Request error calling Edge Function: {e}")
            return "Maaf, terjadi masalah jaringan saat menghubungi AI Assistant."
        except Exception as e:
            print(f"Error in get_ai_response_for_class (Python backend): {e}")
            return "Maaf, terjadi kesalahan internal saat mencoba menjawab pertanyaan Anda."

rag_service = RAGService()
