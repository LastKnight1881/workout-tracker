# Import all models so Base.metadata.create_all() sees every table.
from app.models.exercise import Exercise
from app.models.routine import Routine, RoutineDay, RoutineDayExercise
from app.models.session import WorkoutSession, SessionSet
from app.models.body import BodyWeightLog
from app.models.preferences import UserPreferences

__all__ = [
    "Exercise",
    "Routine",
    "RoutineDay",
    "RoutineDayExercise",
    "WorkoutSession",
    "SessionSet",
    "BodyWeightLog",
    "UserPreferences",
]
