from typing import Optional, List
from pydantic import BaseModel, model_validator
from typing import Optional

class RoutineDayExerciseBase(BaseModel):
    exercise_id: int
    sort_order: int = 0
    default_sets: int = 3
    target_reps: Optional[str] = None
    default_weight: Optional[float] = None
    notes: Optional[str] = None


class RoutineDayExerciseCreate(RoutineDayExerciseBase):
    pass


class RoutineDayExerciseUpdate(BaseModel):
    sort_order: Optional[int] = None
    default_sets: Optional[int] = None
    target_reps: Optional[str] = None
    default_weight: Optional[float] = None
    notes: Optional[str] = None


class RoutineDayExerciseRead(RoutineDayExerciseBase):
    id: int
    exercise_name: Optional[str] = None
    muscle_group: Optional[str] = None

    model_config = {"from_attributes": True}

    @model_validator(mode='wrap')
    @classmethod
    def _enrich_from_relationship(cls, value, handler):
        instance = handler(value)
        # When built from an ORM object, pull exercise name from the relationship
        if hasattr(value, 'exercise') and value.exercise is not None:
            instance.exercise_name = value.exercise.name
            instance.muscle_group = value.exercise.muscle_group
        return instance

    @classmethod
    def from_orm_rde(cls, rde) -> "RoutineDayExerciseRead":
        """Build from a RoutineDayExercise ORM object, pulling name from relationship."""
        return cls.model_validate(rde)


class RoutineDayBase(BaseModel):
    day_number: int
    name: Optional[str] = None


class RoutineDayCreate(RoutineDayBase):
    pass


class RoutineDayUpdate(BaseModel):
    name: Optional[str] = None


class RoutineDayRead(RoutineDayBase):
    id: int
    routine_id: int
    exercises: List[RoutineDayExerciseRead] = []

    model_config = {"from_attributes": True}


class RoutineBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoutineCreate(RoutineBase):
    pass


class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class RoutineRead(RoutineBase):
    id: int
    is_active: int
    created_at: str
    updated_at: str
    days: List[RoutineDayRead] = []

    model_config = {"from_attributes": True}
