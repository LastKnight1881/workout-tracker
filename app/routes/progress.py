from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.progress import PREntry, VolumeEntry, ProgressPoint, OverloadSuggestion
from app.services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/prs", response_model=List[PREntry])
def get_prs(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    return progress_service.get_prs(db, limit=limit)


@router.get("/volume", response_model=List[VolumeEntry])
def get_volume(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    return progress_service.get_volume_history(db, days=days)


@router.get("/exercises/{exercise_id}", response_model=List[ProgressPoint])
def get_exercise_progress(exercise_id: int, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return progress_service.get_exercise_progress(db, exercise_id, limit=limit)


@router.get("/overload/{day_id}", response_model=List[OverloadSuggestion])
def get_overload_suggestions(day_id: int, db: Session = Depends(get_db)):
    return progress_service.get_overload_suggestions(db, day_id)
