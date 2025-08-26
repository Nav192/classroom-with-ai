from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	# Supabase
	supabase_url: str | None = None
	supabase_anon_key: str | None = None

	# AI / Gemini
	gemini_api_key: str | None = None

	# App
	environment: str = "development"

	# Look for .env in multiple locations: project root, backend folder, CWD fallback
	model_config = SettingsConfigDict(
		env_file=(
			str(Path(__file__).resolve().parents[2] / ".env"),
			str(Path(__file__).resolve().parents[1] / ".env"),
			".env",
		),
		env_file_encoding="utf-8",
	)


settings = Settings()  # type: ignore[call-arg]


