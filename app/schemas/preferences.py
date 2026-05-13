from pydantic import BaseModel


class PreferencesOut(BaseModel):
    unit_system: str
    rest_timer_sec: int

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    unit_system: str | None = None
    rest_timer_sec: int | None = None
