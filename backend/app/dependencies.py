from functools import lru_cache
from supabase import create_client, Client

from .config import settings


class MissingSupabaseConfigError(RuntimeError):
	pass


@lru_cache(maxsize=1)
def get_supabase() -> Client:
	if not settings.supabase_url or not settings.supabase_anon_key:
		raise MissingSupabaseConfigError(
			"Missing SUPABASE_URL or SUPABASE_ANON_KEY. Check your .env at project root or backend/."
		)
	return create_client(settings.supabase_url, settings.supabase_anon_key)


