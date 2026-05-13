"""
Routine service — all business logic for routines, days, and day exercises.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.routine import Routine, RoutineDay, RoutineDayExercise
from app.schemas.routine import (
    RoutineCreate, RoutineUpdate,
    RoutineDayCreate, RoutineDayUpdate,
    RoutineDayExerciseCreate, RoutineDayExerciseUpdate,
)


def list_routines(db: Session):
    """Return all routines."""
    return db.query(Routine).order_by(Routine.id).all()


def create_routine(db: Session, data: RoutineCreate) -> Routine:
    """Create a new routine."""
    routine = Routine(name=data.name, description=data.description)
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return routine


def update_routine(db: Session, routine_id: int, data: RoutineUpdate) -> Routine:
    """Update routine name/description."""
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(routine, field, value)
    routine.updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    db.commit()
    db.refresh(routine)
    return routine


def delete_routine(db: Session, routine_id: int) -> None:
    """Hard delete routine (cascade deletes days/exercises)."""
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.delete(routine)
    db.commit()


def activate_routine(db: Session, routine_id: int) -> Routine:
    """Set this routine as active, deactivate all others (atomic)."""
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.query(Routine).update({"is_active": 0})
    routine.is_active = 1
    db.commit()
    db.refresh(routine)
    return routine


def get_active_routine(db: Session) -> Routine:
    """Return active routine with days+exercises nested. Raises 404 if none active."""
    routine = db.query(Routine).filter(Routine.is_active == 1).first()
    if not routine:
        raise HTTPException(status_code=404, detail="No active routine")
    return routine


def get_routine(db: Session, routine_id: int) -> Routine:
    """Get routine by id."""
    routine = db.query(Routine).filter(Routine.id == routine_id).first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


def add_day(db: Session, routine_id: int, data: RoutineDayCreate) -> RoutineDay:
    """Add a day to a routine."""
    get_routine(db, routine_id)
    day = RoutineDay(routine_id=routine_id, day_number=data.day_number, name=data.name)
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


def update_day(db: Session, routine_id: int, day_id: int, data: RoutineDayUpdate) -> RoutineDay:
    """Update a routine day's name."""
    day = db.query(RoutineDay).filter(RoutineDay.id == day_id, RoutineDay.routine_id == routine_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(day, field, value)
    db.commit()
    db.refresh(day)
    return day


def delete_day(db: Session, routine_id: int, day_id: int) -> None:
    """Delete a routine day."""
    day = db.query(RoutineDay).filter(RoutineDay.id == day_id, RoutineDay.routine_id == routine_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    db.delete(day)
    db.commit()


def get_day_exercises(db: Session, day_id: int):
    """Get exercises for a day, ordered by sort_order."""
    return db.query(RoutineDayExercise).filter(RoutineDayExercise.day_id == day_id).order_by(RoutineDayExercise.sort_order).all()


def add_exercise_to_day(db: Session, day_id: int, data: RoutineDayExerciseCreate) -> RoutineDayExercise:
    """Add an exercise to a routine day."""
    rde = RoutineDayExercise(
        day_id=day_id,
        exercise_id=data.exercise_id,
        sort_order=data.sort_order,
        default_sets=data.default_sets,
        target_reps=data.target_reps,
        default_weight=data.default_weight,
        notes=data.notes,
    )
    db.add(rde)
    db.commit()
    db.refresh(rde)
    return rde


def update_day_exercise(db: Session, rde_id: int, data: RoutineDayExerciseUpdate) -> RoutineDayExercise:
    """Update a routine day exercise slot."""
    rde = db.query(RoutineDayExercise).filter(RoutineDayExercise.id == rde_id).first()
    if not rde:
        raise HTTPException(status_code=404, detail="Routine day exercise not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rde, field, value)
    db.commit()
    db.refresh(rde)
    return rde


def remove_exercise_from_day(db: Session, rde_id: int) -> None:
    """Remove an exercise from a routine day."""
    rde = db.query(RoutineDayExercise).filter(RoutineDayExercise.id == rde_id).first()
    if not rde:
        raise HTTPException(status_code=404, detail="Routine day exercise not found")
    db.delete(rde)
    db.commit()


def reorder_day_exercises(db: Session, day_id: int, ordered_ids: List[int]) -> None:
    """Update sort_order for exercises in a day according to provided ordered_ids list."""
    for i, rde_id in enumerate(ordered_ids):
        db.query(RoutineDayExercise).filter(
            RoutineDayExercise.id == rde_id,
            RoutineDayExercise.day_id == day_id,
        ).update({"sort_order": i})
    db.commit()
