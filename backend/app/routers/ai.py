from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from ..services import rag


router = APIRouter()


class ChatRequest(BaseModel):
	query: str


class ChatResponse(BaseModel):
	answer: str
	sources: List[str]


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
	contexts = rag.retrieve_relevant_chunks(payload.query)
	answer = rag.answer_with_gemini(payload.query, [c.get("text", "") for c in contexts])
	return ChatResponse(answer=answer, sources=[c.get("source", "") for c in contexts])


