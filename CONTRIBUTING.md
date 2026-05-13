# Contributing

## Branch Model

- `main` is protected — no direct pushes
- All work happens on feature branches: `feature/<short-description>`
- One GitHub Issue per feature/bug
- One PR per Issue
- PRs are never self-merged without review

## Branch Naming

```
feature/phase1-backend-scaffold
feature/session-rest-timer
fix/set-autofill-fallback
```

## Commit Style

```
feat: add rest timer to session screen
fix: correct weight unit conversion on set log
chore: add seed data for exercise library
```

## Agent Workers

Kanban workers (Claude Sonnet via Copilot) open PRs against `main`.
Landon reviews and merges. Workers never merge their own PRs.

## Architecture Rules

- Business logic lives in `app/services/` — never in routers
- All frontend API calls go through `static/js/api.js` — never fetch() elsewhere
- Business logic portable to Android lives in `static/js/services/` — pure JS, no fetch()
- All weights stored in lbs in DB; display via `formatWeight()` in `static/js/utils.js` only
- DB schema changes are append-only — no breaking migrations
