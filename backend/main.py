from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, materials, users

app = FastAPI()

# CORS Middleware
origins = [
    "http://localhost",
    "http://localhost:3000", # Default React dev server port
    "http://localhost:5173", # Vite dev server port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth")
app.include_router(materials.router, prefix="/api/materials")
app.include_router(users.router, prefix="/api/users")

@app.get("/")
def read_root():
    return {"message": "Welcome to Classroom AI Backend"}
