from typing import Optional
from pydantic import BaseModel


class ExerciseBase(BaseModel):
    name: str
    muscle_group: Optional[str] = None
    equipment: Optional[str] = None
    is_custom: int = 0
    notes: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle_group: Optional[str] = None
    equipment: Optional[str] = None
    notes: Optional[str] = None


class ExerciseRead(ExerciseBase):
    id: int
    is_hidden: int
    created_at: str

    model_config = {"from_attributes": True}
