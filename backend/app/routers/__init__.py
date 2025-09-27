"""Routers package."""

from fastapi import APIRouter

from . import auth, admin, materials, quizzes, results, reports, ai, progress, classes, users, dashboard, quiz_weights


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["quizzes"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(users.router, prefix="", tags=["users"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(quiz_weights.router, prefix="/classes", tags=["quiz_weights"])


