from typing import List, Dict, Any


def extract_text_from_document(file_bytes: bytes, file_type: str) -> str:
	"""Stub for document parsing. Implement PDF/PPT/TXT parsing."""
	# TODO: integrate pypdf, python-pptx, or unstructured
	return ""


def embed_text_chunks(chunks: List[str]) -> List[List[float]]:
	"""Stub for embedding generation using Gemini or other model."""
	# TODO: call embedding API and return vectors
	return [[0.0 for _ in range(768)] for _ in chunks]


def upsert_embeddings(vectors: List[List[float]], metadatas: List[Dict[str, Any]]):
	"""Stub for storing vectors into Supabase pgvector table."""
	# TODO: insert into supabase table `material_embeddings`
	return None


def retrieve_relevant_chunks(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
	"""Stub for similarity search over embeddings."""
	# TODO: perform similarity search in Supabase
	return []


def answer_with_gemini(query: str, contexts: List[str]) -> str:
	"""Stub for calling Gemini to answer with provided contexts."""
	# TODO: call Gemini chat/completions with system prompt + contexts
	return ""


