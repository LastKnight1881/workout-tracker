from sqlalchemy import Column, Integer, Text, Float, ForeignKey, UniqueConstraint
from app.database import Base


class Routine(Base):
    """A named workout routine (e.g. '2025 PLPRRx2')."""
    __tablename__ = "routines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    is_active = Column(Integer, nullable=False, default=0)
    created_at = Column(Text, nullable=False, server_default="(datetime('now'))")
    updated_at = Column(Text, nullable=False, server_default="(datetime('now'))")


class RoutineDay(Base):
    """A numbered day within a routine (e.g. Day 1 - Push A)."""
    __tablename__ = "routine_days"

    id = Column(Integer, primary_key=True, autoincrement=True)
    routine_id = Column(Integer, ForeignKey("routines.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    name = Column(Text)

    __table_args__ = (UniqueConstraint("routine_id", "day_number"),)


class RoutineDayExercise(Base):
    """An exercise slot within a routine day, with default sets/reps/weight."""
    __tablename__ = "routine_day_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    day_id = Column(Integer, ForeignKey("routine_days.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    default_sets = Column(Integer, nullable=False, default=3)
    target_reps = Column(Text)  # comma-separated: "8,8,8,12" — NOT default_reps
    default_weight = Column(Float)  # NULL = bodyweight
    notes = Column(Text)
