from sqlalchemy.orm import Session
from app.models.preferences import UserPreferences


def _get_or_create(db: Session) -> UserPreferences:
    prefs = db.query(UserPreferences).filter(UserPreferences.id == 1).first()
    if not prefs:
        prefs = UserPreferences(id=1, unit_system="imperial", rest_timer_default=90)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def get_prefs(db: Session) -> dict:
    prefs = _get_or_create(db)
    return {"unit_system": prefs.unit_system, "rest_timer_sec": prefs.rest_timer_default}


def update_prefs(db: Session, data: dict) -> dict:
    prefs = _get_or_create(db)
    if "unit_system" in data and data["unit_system"] is not None:
        prefs.unit_system = data["unit_system"]
    if "rest_timer_sec" in data and data["rest_timer_sec"] is not None:
        prefs.rest_timer_default = data["rest_timer_sec"]
    db.commit()
    db.refresh(prefs)
    return {"unit_system": prefs.unit_system, "rest_timer_sec": prefs.rest_timer_default}
