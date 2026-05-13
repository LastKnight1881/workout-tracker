"""
Exercise service — all business logic for the exercise library.
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate
from app.seed_data import EXERCISES


def seed_exercises(db: Session) -> None:
    """Insert seed exercises if the table is empty."""
    if db.query(Exercise).count() > 0:
        return
    for name, muscle_group, equipment, is_custom in EXERCISES:
        ex = Exercise(
            name=name,
            muscle_group=muscle_group,
            equipment=equipment,
            is_custom=is_custom,
        )
        db.add(ex)
    db.commit()


def list_exercises(
    db: Session,
    muscle_group: Optional[str] = None,
    equipment: Optional[str] = None,
    custom_only: bool = False,
):
    """List exercises, excluding hidden. Optionally filter by muscle_group, equipment, or custom."""
    q = db.query(Exercise).filter(Exercise.is_hidden == 0)
    if muscle_group:
        q = q.filter(Exercise.muscle_group == muscle_group)
    if equipment:
        q = q.filter(Exercise.equipment == equipment)
    if custom_only:
        q = q.filter(Exercise.is_custom == 1)
    return q.order_by(Exercise.name).all()


def create_exercise(db: Session, data: ExerciseCreate) -> Exercise:
    """Create a new exercise. Always sets is_custom=True."""
    ex = Exercise(
        name=data.name,
        muscle_group=data.muscle_group,
        equipment=data.equipment,
        is_custom=1,
        notes=data.notes,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


def update_exercise(db: Session, exercise_id: int, data: ExerciseUpdate) -> Exercise:
    """Update exercise. Only custom exercises are updatable."""
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if not ex.is_custom:
        raise HTTPException(status_code=403, detail="Only custom exercises can be updated")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ex, field, value)
    db.commit()
    db.refresh(ex)
    return ex


def hide_exercise(db: Session, exercise_id: int) -> None:
    """Soft-delete built-in exercises (is_hidden=True), hard-delete custom ones."""
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if ex.is_custom:
        db.delete(ex)
    else:
        ex.is_hidden = 1
    db.commit()
