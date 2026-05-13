from dataclasses import dataclass


@dataclass
class Settings:
    PORT: int = 8765
    DB_PATH: str = "data/workout.db"
    REST_TIMER_DEFAULT_SEC: int = 60


settings = Settings()
