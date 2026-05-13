from sqlalchemy import Column, Integer, Text, Float, UniqueConstraint
from app.database import Base


class BodyWeightLog(Base):
    """Daily body weight log entry."""
    __tablename__ = "body_weight_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Text, nullable=False, unique=True)
    weight = Column(Float, nullable=False)
