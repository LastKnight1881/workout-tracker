# Workout Tracker

Self-hosted workout tracking web app. FastAPI + SQLite + vanilla JS. Runs on lwb-ai at port 8765.

## Features
- Multiple routines with day cycles
- Exercise library (pre-built + custom)
- Session tracking with rest timer
- Progress charts, PR detection, 1RM estimation
- Plate calculator, progressive overload suggestions
- Imperial / metric unit toggle

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```

Open http://localhost:8765

## Project Docs

Full requirements, architecture, and implementation plan live in the Obsidian vault under `Projects/Workout_Tracker/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — all changes go through feature branches and PRs, no direct pushes to `main`.
