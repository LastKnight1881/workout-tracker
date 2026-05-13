# Workout Tracker

Self-hosted workout tracking web app. FastAPI + SQLite + vanilla JS. Runs on lwb-ai at port 8765.

## Stack

- **Backend:** FastAPI, SQLAlchemy ORM, SQLite (`workout.db`)
- **Frontend:** Vanilla JS (ES modules), Chart.js 4.4.0
- **Service:** systemd user service (`workout-tracker.service`)
- **Venv:** `venv/` (not `.venv/`)

## Features

- Multiple routines with day cycles; one active at a time
- Exercise library (265 pre-built + custom exercises)
- Session flow: Ready screen → Begin → live elapsed timer → Finish/Cancel
- Per-set logging: weight (lbs or BW), reps, warm-up flag
- Rest timer with audible alert
- Add sets on the fly; swap exercises mid-session
- Cancel Workout (deletes session + all logged sets)
- Progress charts: weight over time, estimated 1RM, volume per session
- Date range picker + preset buttons (30d / 3mo / 6mo / 1yr / All) on charts
- PR detection, 1RM estimation (Epley formula)
- Session history log with workout calendar
- Plate calculator, progressive overload suggestions
- Session notes

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8765
```

Open http://localhost:8765

## Systemd Service

```bash
systemctl --user status workout-tracker
systemctl --user restart workout-tracker
journalctl --user -u workout-tracker -f
```

## Architecture

```
app/
  main.py              # FastAPI app factory
  models/              # SQLAlchemy ORM models
  routes/              # API route handlers (thin — delegate to services)
  services/            # Business logic
  database.py          # DB session + engine
static/
  index.html
  js/
    api.js             # ALL fetch calls live here, nowhere else
    app.js             # Router + nav
    pages/             # One file per page (home, session, history, routines, exercises, settings)
    services/          # Frontend business logic
  css/style.css
```

## Key Conventions

- All frontend API calls go in `static/js/api.js` only
- Weights stored canonically in lbs; display converts per user preference
- DB migrations are append-only (never destructive)
- All changes via feature branch + PR; no direct pushes to `main`

## Project Docs

Full requirements, architecture, and implementation plan live in the Obsidian vault:
`/fast/shared/Documents/Obsidian Vault/obsidian-gtd-main/01 Project Management/Projects/Workout_Tracker/`
