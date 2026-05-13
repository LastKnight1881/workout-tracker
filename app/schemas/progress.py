from typing import Optional, List
from pydantic import BaseModel


class PREntry(BaseModel):
    exercise_id: int
    exercise_name: str
    weight: Optional[float]
    reps: int
    date: str


class VolumeEntry(BaseModel):
    date: str
    total_volume_lbs: float


class ProgressPoint(BaseModel):
    date: str
    weight: Optional[float]
    reps: int
    estimated_1rm: Optional[float]


class OverloadSuggestion(BaseModel):
    exercise_id: int
    exercise_name: str
    suggested_weight: Optional[float]
    suggested_reps: Optional[int]
    reason: str
