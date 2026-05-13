"""
Progress service — analytics, PRs, volume, 1RM calculations, overload suggestions.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.session import WorkoutSession, SessionSet
from app.models.exercise import Exercise
from app.schemas.progress import PREntry, VolumeEntry, ProgressPoint, OverloadSuggestion


def epley_1rm(weight: float, reps: int) -> float:
    """Epley formula: 1RM = weight * (1 + reps / 30)."""
    if reps == 1:
        return weight
    return round(weight * (1 + reps / 30), 1)


def get_prs(db: Session, limit: int = 20) -> List[PREntry]:
    """Return recent PR entries (is_pr=1) ordered by date desc."""
    rows = (
        db.query(SessionSet, Exercise.name, WorkoutSession.started_at)
        .join(Exercise, Exercise.id == SessionSet.exercise_id)
        .join(WorkoutSession, WorkoutSession.id == SessionSet.session_id)
        .filter(SessionSet.is_pr == 1)
        .order_by(WorkoutSession.started_at.desc())
        .limit(limit)
        .all()
    )
    return [
        PREntry(
            exercise_id=row.SessionSet.exercise_id,
            exercise_name=row.name,
            weight=row.SessionSet.weight,
            reps=row.SessionSet.reps,
            date=row.started_at[:10],
        )
        for row in rows
    ]


def get_volume_history(db: Session, days: int = 30) -> List[VolumeEntry]:
    """Total volume (weight * reps) per workout day over last N days."""
    rows = (
        db.query(
            func.date(WorkoutSession.started_at).label("date"),
            func.sum(SessionSet.weight * SessionSet.reps).label("volume"),
        )
        .join(SessionSet, SessionSet.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.finished_at.isnot(None),
            SessionSet.weight.isnot(None),
            SessionSet.is_warmup == 0,
        )
        .group_by(func.date(WorkoutSession.started_at))
        .order_by(func.date(WorkoutSession.started_at).desc())
        .limit(days)
        .all()
    )
    return [VolumeEntry(date=r.date, total_volume_lbs=round(r.volume or 0, 1)) for r in rows]


def get_exercise_progress(db: Session, exercise_id: int, limit: int = 50) -> List[ProgressPoint]:
    """Best set per session for an exercise (heaviest weight, tiebreak: most reps). Returns estimated 1RM."""
    # Get all sessions that had this exercise
    sessions = (
        db.query(WorkoutSession.id, WorkoutSession.started_at)
        .join(SessionSet, SessionSet.session_id == WorkoutSession.id)
        .filter(SessionSet.exercise_id == exercise_id, WorkoutSession.finished_at.isnot(None))
        .distinct()
        .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id.desc())
        .limit(limit)
        .all()
    )
    result = []
    for session_row in sessions:
        best_set = (
            db.query(SessionSet)
            .filter(
                SessionSet.session_id == session_row.id,
                SessionSet.exercise_id == exercise_id,
                SessionSet.is_warmup == 0,
                SessionSet.weight.isnot(None),
            )
            .order_by(SessionSet.weight.desc(), SessionSet.reps.desc())
            .first()
        )
        if best_set:
            e1rm = epley_1rm(best_set.weight, best_set.reps) if best_set.weight else None
            result.append(ProgressPoint(
                date=session_row.started_at[:10],
                weight=best_set.weight,
                reps=best_set.reps,
                estimated_1rm=e1rm,
            ))
    return result


def get_overload_suggestions(db: Session, day_id: int) -> List[OverloadSuggestion]:
    """
    For each exercise in a routine day, compare last session to the one before.
    Suggest 2.5 lb increase if reps match or exceed target.
    """
    from app.models.routine import RoutineDayExercise
    day_exercises = (
        db.query(RoutineDayExercise)
        .filter(RoutineDayExercise.day_id == day_id)
        .all()
    )
    suggestions = []
    for rde in day_exercises:
        progress = get_exercise_progress(db, rde.exercise_id, limit=2)
        if not progress:
            suggestions.append(OverloadSuggestion(
                exercise_id=rde.exercise_id,
                exercise_name="",
                suggested_weight=rde.default_weight,
                suggested_reps=None,
                reason="No history — use default weight",
            ))
            continue

        last = progress[0]
        prev = progress[1] if len(progress) > 1 else None
        ex = db.query(Exercise).filter(Exercise.id == rde.exercise_id).first()
        ex_name = ex.name if ex else str(rde.exercise_id)

        if last.weight is not None and prev and prev.weight is not None and last.weight >= prev.weight and last.reps >= (prev.reps or 0):
            new_weight = round(last.weight + 2.5, 1)
            reason = f"Matched or exceeded last session — increase by 2.5 lbs"
        else:
            new_weight = last.weight
            reason = "Repeat last session weight"

        suggestions.append(OverloadSuggestion(
            exercise_id=rde.exercise_id,
            exercise_name=ex_name,
            suggested_weight=new_weight,
            suggested_reps=None,
            reason=reason,
        ))
    return suggestions
