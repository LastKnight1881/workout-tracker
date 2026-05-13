from sqlalchemy import Column, Integer, Text, Float, ForeignKey
from app.database import Base


class WorkoutSession(Base):
    """A single workout session (start to finish)."""
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    routine_id = Column(Integer, ForeignKey("routines.id"))
    day_id = Column(Integer, ForeignKey("routine_days.id"))
    started_at = Column(Text, nullable=False, server_default="(datetime('now'))")
    finished_at = Column(Text)
    notes = Column(Text)
    bodyweight = Column(Float)


class SessionSet(Base):
    """A single set logged during a workout session. is_pr=1 if weight is a personal record."""
    __tablename__ = "session_sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False)
    weight = Column(Float)
    reps = Column(Integer, nullable=False)
    is_warmup = Column(Integer, nullable=False, default=0)
    rpe = Column(Integer)
    is_pr = Column(Integer, nullable=False, default=0)
    completed_at = Column(Text, nullable=False, server_default="(datetime('now'))")
