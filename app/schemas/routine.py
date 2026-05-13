from typing import Optional, List
from pydantic import BaseModel


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

    model_config = {"from_attributes": True}


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
