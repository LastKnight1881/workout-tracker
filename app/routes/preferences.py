from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.preferences import PreferencesOut, PreferencesUpdate
from app.services import preferences_service

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


@router.get("", response_model=PreferencesOut)
def get_preferences(db: Session = Depends(get_db)):
    return preferences_service.get_prefs(db)


@router.put("", response_model=PreferencesOut)
def update_preferences(data: PreferencesUpdate, db: Session = Depends(get_db)):
    return preferences_service.update_prefs(db, data.model_dump(exclude_none=False))
