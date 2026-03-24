from fastapi import APIRouter


router = APIRouter(prefix="/api/dashboard")

@router.get("/stats")