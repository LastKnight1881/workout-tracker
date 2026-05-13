from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.session import (
    SessionRead, SessionStart, SessionUpdate,
    SetCreate, SetRead, SetUpdate, LastSetEntry,
)
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=List[SessionRead])
def list_sessions(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return session_service.list_sessions(db, limit=limit, offset=offset)


@router.post("/start", response_model=SessionRead, status_code=201)
def start_session(data: SessionStart, db: Session = Depends(get_db)):
    return session_service.start_session(db, data.day_id, data.routine_id)


@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)):
    return session_service.get_session(db, session_id)


@router.put("/{session_id}", response_model=SessionRead)
def update_session(session_id: int, data: SessionUpdate, db: Session = Depends(get_db)):
    return session_service.update_session(db, session_id, data)


@router.post("/{session_id}/finish", response_model=SessionRead)
def finish_session(session_id: int, data: SessionUpdate, db: Session = Depends(get_db)):
    return session_service.finish_session(db, session_id, notes=data.notes, bodyweight=data.bodyweight)


@router.post("/{session_id}/sets", response_model=SetRead, status_code=201)
def log_set(session_id: int, data: SetCreate, db: Session = Depends(get_db)):
    return session_service.log_set(db, session_id, data)


@router.delete("/{session_id}/sets/{set_id}", status_code=204)
def delete_set(session_id: int, set_id: int, db: Session = Depends(get_db)):
    session_service.delete_set(db, session_id, set_id)


@router.put("/{session_id}/sets/{set_id}", response_model=SetRead)
def update_set(session_id: int, set_id: int, data: SetUpdate, db: Session = Depends(get_db)):
    return session_service.update_set(db, session_id, set_id, data)


@router.get("/exercises/{exercise_id}/last", response_model=List[LastSetEntry])
def get_last_sets(exercise_id: int, db: Session = Depends(get_db)):
    return session_service.get_last_session_sets(db, exercise_id)
