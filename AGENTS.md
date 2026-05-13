# Workout Tracker — Agent Onboarding

## What This Is
Self-hosted workout tracking web app. FastAPI + SQLite + vanilla JS. Runs on lwb-ai at port 8765.

## Quick Start
```bash
cd /home/landon/projects/workout-tracker
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```
Swagger docs at http://localhost:8765/docs

## Architecture

### Backend
```
app/
  main.py          — FastAPI app, lifespan (table creation + seed)
  config.py        — settings (PORT, DB_PATH, REST_TIMER_DEFAULT_SEC)
  database.py      — SQLAlchemy engine, SessionLocal, get_db()
  models/          — ORM models (exercise, routine, session, preferences, body)
  schemas/         — Pydantic request/response schemas
  routes/          — HTTP endpoints (exercises, routines, sessions, progress)
  services/        — ALL business logic lives here, never in routes
  seed_data.py     — EXERCISES list; seeded by exercise_service.seed_exercises()
```

### Rule: routes → services → models. No business logic in routes.

### Frontend (not yet built — Phase 2)
```
static/
  js/
    api.js          — ALL fetch calls. No fetch anywhere else.
    services/       — Pure JS business logic. No fetch.
    utils.js        — formatWeight(lbs, unit) / parseWeight(val, unit). ONLY unit conversion points.
  css/
  index.html
```

## Database
- SQLite at `data/workout.db`
- Weights stored canonically in **lbs**. Display unit controlled by user preference.
- Schema changes must be **append-only** (no breaking changes, no column drops)
- Tables auto-created on startup via `Base.metadata.create_all()`
- Seed exercises inserted on startup if table is empty

## Key Models
| Model | Notes |
|---|---|
| Exercise | name, muscle_group, equipment, is_custom, is_active |
| Routine | name, is_active (only 1 active at a time) |
| RoutineDay | routine_id, day_number, name |
| RoutineDayExercise | routine_day_id, exercise_id, set_count, target_reps (TEXT, comma-sep e.g. "8,8,8,12"), target_weight_lbs, sort_order |
| WorkoutSession | routine_day_id, started_at, finished_at, notes |
| SessionSet | session_id, exercise_id, set_number, weight_lbs, reps, is_warmup, is_pr |
| UserPreferences | unit ("lbs"/"kg"), rest_timer_sec |

## Active Routine
"2025 PLPRRx2" — 8-day cycle: Push A → Leg A → Pull A → Rest → Rest → Push B → Pull B → Leg B
- Day 1 Push A, Day 2 Pull A, Day 3 Leg A, Day 4 Rest, Day 5 Rest, Day 6 Push B, Day 7 Pull B, Day 8 Leg B
- Seeded via `seed_data.py` and the routine_service

## Testing
```bash
source venv/bin/activate
pytest tests/ -v          # 29 tests across exercises, routines, sessions, progress
```

## GitHub Workflow
- Repo: https://github.com/LastKnight1881/workout-tracker
- Branch protection on `main` — no direct push, PR required
- One issue → one PR. No self-merge.
- Feature branches: `feat/<name>`, fixes: `fix/<name>`

## Deployment (systemd)
- Service: `workout-tracker.service` (Phase 4 — not yet deployed)
- Target: lwb-ai (192.168.68.30), port 8765
- Will use `/home/landon/projects/workout-tracker/` as workdir

## Vault Docs
Planning docs in `/fast/shared/Documents/Obsidian Vault/obsidian-gtd-main/Projects/Workout_Tracker/`:
- `Requirements.md` — full feature spec
- `Implementation_Plan.md` — 5 phases, DDL, endpoint design
- `Implementation_Log.md` — change log
- `Architecture.md` — ADRs and design decisions

## Phase Status
- [x] Phase 1: Backend API (routes, services, models, seed, tests — 29/29)
- [ ] Phase 2: Frontend UI (vanilla JS, session flow, rest timer)
- [ ] Phase 3: Charts, history, PR display, plate calc, 1RM, CSV export
- [ ] Phase 4: systemd deploy, logging, /debug panel, watchdog cron
- [ ] Phase 5: Polish/QoL

## Pitfalls
- `app/routes/` is canonical. `app/routers/` was an empty scaffold — deleted.
- `datetime.utcnow()` is deprecated — use `datetime.now(timezone.utc)` throughout.
- `seed_exercises()` only runs if the exercises table is empty. Delete data/workout.db to re-seed.
- The DB file lives at `data/workout.db` relative to project root (created at runtime, gitignored).
