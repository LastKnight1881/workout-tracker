from typing import Optional, List
from pydantic import BaseModel


class SessionStart(BaseModel):
    day_id: Optional[int] = None
    routine_id: Optional[int] = None


class SetCreate(BaseModel):
    exercise_id: int
    set_number: int
    weight: Optional[float] = None
    reps: int
    is_warmup: int = 0
    rpe: Optional[int] = None


class SetUpdate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[int] = None
    is_warmup: Optional[int] = None
    rpe: Optional[int] = None


class SetRead(SetCreate):
    id: int
    session_id: int
    is_pr: int
    completed_at: str

    model_config = {"from_attributes": True}


class SessionUpdate(BaseModel):
    notes: Optional[str] = None
    bodyweight: Optional[float] = None


class SessionRead(BaseModel):
    id: int
    routine_id: Optional[int]
    day_id: Optional[int]
    started_at: str
    finished_at: Optional[str]
    notes: Optional[str]
    bodyweight: Optional[float]
    sets: List[SetRead] = []

    model_config = {"from_attributes": True}


class LastSetEntry(BaseModel):
    set_number: int
    weight: Optional[float]
    reps: int
