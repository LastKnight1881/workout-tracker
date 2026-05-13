from sqlalchemy import Column, Integer, Text
from app.database import Base


class UserPreferences(Base):
    """Singleton user preferences row (always id=1)."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, default=1)
    unit_system = Column(Text, nullable=False, default="imperial")
    rest_timer_default = Column(Integer, nullable=False, default=60)
