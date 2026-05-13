from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.routine import (
    RoutineRead, RoutineCreate, RoutineUpdate,
    RoutineDayRead, RoutineDayCreate, RoutineDayUpdate,
    RoutineDayExerciseRead, RoutineDayExerciseCreate, RoutineDayExerciseUpdate,
)
from app.services import routine_service

router = APIRouter(prefix="/routines", tags=["routines"])


@router.get("/", response_model=List[RoutineRead])
def list_routines(db: Session = Depends(get_db)):
    return routine_service.list_routines(db)


@router.post("/", response_model=RoutineRead, status_code=201)
def create_routine(data: RoutineCreate, db: Session = Depends(get_db)):
    return routine_service.create_routine(db, data)


@router.get("/active", response_model=RoutineRead)
def get_active_routine(db: Session = Depends(get_db)):
    return routine_service.get_active_routine(db)


@router.get("/{routine_id}", response_model=RoutineRead)
def get_routine(routine_id: int, db: Session = Depends(get_db)):
    return routine_service.get_routine(db, routine_id)


@router.put("/{routine_id}", response_model=RoutineRead)
def update_routine(routine_id: int, data: RoutineUpdate, db: Session = Depends(get_db)):
    return routine_service.update_routine(db, routine_id, data)


@router.delete("/{routine_id}", status_code=204)
def delete_routine(routine_id: int, db: Session = Depends(get_db)):
    routine_service.delete_routine(db, routine_id)


@router.post("/{routine_id}/activate", response_model=RoutineRead)
def activate_routine(routine_id: int, db: Session = Depends(get_db)):
    return routine_service.activate_routine(db, routine_id)


@router.post("/{routine_id}/days", response_model=RoutineDayRead, status_code=201)
def add_day(routine_id: int, data: RoutineDayCreate, db: Session = Depends(get_db)):
    return routine_service.add_day(db, routine_id, data)


@router.put("/{routine_id}/days/{day_id}", response_model=RoutineDayRead)
def update_day(routine_id: int, day_id: int, data: RoutineDayUpdate, db: Session = Depends(get_db)):
    return routine_service.update_day(db, routine_id, day_id, data)


@router.delete("/{routine_id}/days/{day_id}", status_code=204)
def delete_day(routine_id: int, day_id: int, db: Session = Depends(get_db)):
    routine_service.delete_day(db, routine_id, day_id)


@router.post("/days/{day_id}/exercises", response_model=RoutineDayExerciseRead, status_code=201)
def add_exercise(day_id: int, data: RoutineDayExerciseCreate, db: Session = Depends(get_db)):
    return routine_service.add_exercise_to_day(db, day_id, data)


@router.put("/days/exercises/{rde_id}", response_model=RoutineDayExerciseRead)
def update_day_exercise(rde_id: int, data: RoutineDayExerciseUpdate, db: Session = Depends(get_db)):
    return routine_service.update_day_exercise(db, rde_id, data)


@router.delete("/days/exercises/{rde_id}", status_code=204)
def remove_exercise(rde_id: int, db: Session = Depends(get_db)):
    routine_service.remove_exercise_from_day(db, rde_id)


@router.post("/days/{day_id}/reorder")
def reorder_exercises(day_id: int, ordered_ids: List[int], db: Session = Depends(get_db)):
    routine_service.reorder_day_exercises(db, day_id, ordered_ids)
    return {"ok": True}
