from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.exercise import ExerciseRead, ExerciseCreate, ExerciseUpdate
from app.services import exercise_service

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("/", response_model=list[ExerciseRead])
def list_exercises(
    muscle_group: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    custom_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    return exercise_service.list_exercises(db, muscle_group=muscle_group, equipment=equipment, custom_only=custom_only)


@router.post("/", response_model=ExerciseRead, status_code=201)
def create_exercise(data: ExerciseCreate, db: Session = Depends(get_db)):
    return exercise_service.create_exercise(db, data)


@router.put("/{exercise_id}", response_model=ExerciseRead)
def update_exercise(exercise_id: int, data: ExerciseUpdate, db: Session = Depends(get_db)):
    return exercise_service.update_exercise(db, exercise_id, data)


@router.delete("/{exercise_id}", status_code=204)
def hide_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise_service.hide_exercise(db, exercise_id)
