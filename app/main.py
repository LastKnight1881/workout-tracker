import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal
import app.models  # noqa: F401 — registers all ORM models with Base
from app.database import Base
from app.services.exercise_service import seed_exercises


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup, seed exercise library if empty."""
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_exercises(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Workout Tracker",
    description="Personal workout tracker API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import exercises, routines, sessions, progress

app.include_router(exercises.router)
app.include_router(routines.router)
app.include_router(sessions.router)
app.include_router(progress.router)


@app.get("/health")
def health():
    return {"status": "ok"}
