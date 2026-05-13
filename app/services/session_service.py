"""
Session service — all business logic for workout sessions and set logging.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.session import WorkoutSession, SessionSet
from app.schemas.session import SetCreate, SetUpdate, SessionUpdate, LastSetEntry


def start_session(db: Session, day_id: Optional[int], routine_id: Optional[int]) -> WorkoutSession:
    """Create a new workout session."""
    session = WorkoutSession(
        day_id=day_id,
        routine_id=routine_id,
        started_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_last_session_sets(db: Session, exercise_id: int) -> List[LastSetEntry]:
    """
    Find the most recently COMPLETED session containing this exercise,
    return its sets ordered by set_number. Returns [] if none.
    """
    # Find the most recent completed session with this exercise
    sub = (
        db.query(SessionSet.session_id)
        .join(WorkoutSession, WorkoutSession.id == SessionSet.session_id)
        .filter(
            SessionSet.exercise_id == exercise_id,
            WorkoutSession.finished_at.isnot(None),
        )
        .order_by(WorkoutSession.finished_at.desc())
        .limit(1)
        .scalar_subquery()
    )
    sets = (
        db.query(SessionSet)
        .filter(SessionSet.session_id == sub, SessionSet.exercise_id == exercise_id)
        .order_by(SessionSet.set_number)
        .all()
    )
    return [LastSetEntry(set_number=s.set_number, weight=s.weight, reps=s.reps) for s in sets]


def _check_pr(db: Session, exercise_id: int, weight: Optional[float]) -> bool:
    """Return True if weight is a PR (greater than all prior session_sets.weight for this exercise)."""
    if weight is None:
        return False
    max_weight = (
        db.query(SessionSet.weight)
        .filter(SessionSet.exercise_id == exercise_id, SessionSet.weight.isnot(None))
        .order_by(SessionSet.weight.desc())
        .first()
    )
    if max_weight is None:
        return True
    return weight > max_weight[0]


def log_set(db: Session, session_id: int, set_data: SetCreate) -> SessionSet:
    """Log a set. Checks for PR by comparing weight to all prior sets for this exercise."""
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    is_pr = 1 if _check_pr(db, set_data.exercise_id, set_data.weight) else 0
    s = SessionSet(
        session_id=session_id,
        exercise_id=set_data.exercise_id,
        set_number=set_data.set_number,
        weight=set_data.weight,
        reps=set_data.reps,
        is_warmup=set_data.is_warmup,
        rpe=set_data.rpe,
        is_pr=is_pr,
        completed_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def finish_session(db: Session, session_id: int, notes: Optional[str], bodyweight: Optional[float]) -> WorkoutSession:
    """Mark session as finished."""
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.finished_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    if notes is not None:
        session.notes = notes
    if bodyweight is not None:
        session.bodyweight = bodyweight
    db.commit()
    db.refresh(session)
    return session


def list_sessions(db: Session, limit: int = 20, offset: int = 0):
    """Paginated list of sessions, newest first."""
    return (
        db.query(WorkoutSession)
        .order_by(WorkoutSession.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_session(db: Session, session_id: int) -> WorkoutSession:
    """Get session with all sets."""
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def update_session(db: Session, session_id: int, data: SessionUpdate) -> WorkoutSession:
    """Update session notes/bodyweight."""
    session = get_session(db, session_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


def delete_set(db: Session, session_id: int, set_id: int) -> None:
    """Delete a set from a session."""
    s = db.query(SessionSet).filter(SessionSet.id == set_id, SessionSet.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    db.delete(s)
    db.commit()


def update_set(db: Session, session_id: int, set_id: int, data: SetUpdate) -> SessionSet:
    """Update a set within a session."""
    s = db.query(SessionSet).filter(SessionSet.id == set_id, SessionSet.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s
