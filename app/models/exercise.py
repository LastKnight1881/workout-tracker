from sqlalchemy import Column, Integer, Text, Float
from app.database import Base


class Exercise(Base):
    """Exercise library entry. is_hidden=1 means soft-deleted (hidden from lists)."""
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    muscle_group = Column(Text)
    equipment = Column(Text)
    is_custom = Column(Integer, nullable=False, default=0)
    is_hidden = Column(Integer, nullable=False, default=0)
    notes = Column(Text)
    created_at = Column(Text, nullable=False, server_default="(datetime('now'))")
