from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from ..dependencies import get_supabase


router = APIRouter()


class LoginRequest(BaseModel):
	email: EmailStr
	password: str


class LoginResponse(BaseModel):
	access_token: str
	user_id: str


class RegisterRequest(BaseModel):
	email: EmailStr
	password: str
	role: str  # "teacher" | "student"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
	sb = get_supabase()
	try:
		res = sb.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
		user = res.user
		session = res.session
		if user is None or session is None or session.access_token is None:
			raise HTTPException(status_code=401, detail="Invalid credentials")
		return LoginResponse(access_token=session.access_token, user_id=user.id)
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=401, detail=str(exc))


@router.post("/register")
def register(payload: RegisterRequest):
	sb = get_supabase()
	try:
		res = sb.auth.sign_up({"email": payload.email, "password": payload.password})
		# Store role in a public profile table later; for now, return basic info
		return {"user_id": res.user.id if res.user else None, "email": payload.email, "role": payload.role}
	except Exception as exc:  # noqa: BLE001
		raise HTTPException(status_code=400, detail=str(exc))


