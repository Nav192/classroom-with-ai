from supabase import create_client, Client
from app.config import settings

url: str = settings.SUPABASE_URL
key: str = settings.supabase_anon_key

if not url or not key:
    raise ValueError("Supabase URL and Key must be set in the .env file")

supabase: Client = create_client(url, key)
