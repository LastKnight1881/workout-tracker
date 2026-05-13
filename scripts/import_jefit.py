#!/usr/bin/env python3
"""
JEFIT CSV importer for workout-tracker.
Imports: routines, routine days, exercises (custom too), session history.

Usage:
    python3 scripts/import_jefit.py <path-to-jefit-csv>

Idempotent: re-running skips already-present data (routines by name,
exercises by name, sessions by started_at).
"""

import sys
import csv
import io
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

CSV_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "/fast/shared/Documents/Obsidian Vault/obsidian-gtd-main"
    "/01 Project Management/Projects/Workout_Tracker"
    "/landonwb_20260513_JEFIT_Export.csv"
)
DB_PATH = Path(__file__).parent.parent / "data" / "workout.db"
ACTIVE_ROUTINE_NAME = "2025 PLPRRx2"

# --------------------------------------------------------------------------- #
#  helpers
# --------------------------------------------------------------------------- #

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_sections(csv_path: Path) -> dict:
    """
    Split the JEFIT CSV into named sub-sections.
    Returns dict of section_name -> list[list[str]] (raw rows).
    The JEFIT CSV interleaves multiple small CSV sub-tables separated by
    blank lines.  Each sub-table starts with a header row.
    Top-level section markers look like:  ### ROUTINES ###...
    """
    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    # Split by top-level section headers (lines starting with "### ")
    section_re = re.compile(r"^### ([A-Z ]+)#{0,50}", re.MULTILINE)
    parts = section_re.split(raw)
    # parts = [pre, name1, body1, name2, body2, ...]

    sections = {}
    it = iter(parts)
    next(it)  # discard pre-header text
    for name, body in zip(it, it):
        name = name.strip()
        sections[name] = body

    return sections


def split_subtables(section_body: str) -> list:
    """
    A section body may contain multiple CSV sub-tables separated by blank lines.
    Return list of (header: list[str], rows: list[dict]).
    """
    tables = []
    current_lines = []
    for line in section_body.splitlines():
        stripped = line.rstrip()
        if stripped == "":
            if current_lines:
                _flush_table(current_lines, tables)
                current_lines = []
        else:
            current_lines.append(stripped)
    if current_lines:
        _flush_table(current_lines, tables)
    return tables


def _flush_table(lines, tables):
    if len(lines) < 2:
        return
    text = "\n".join(lines)
    reader = csv.DictReader(io.StringIO(text))
    try:
        rows = list(reader)
    except Exception:
        return
    if rows:
        tables.append(rows)


# --------------------------------------------------------------------------- #
#  exercise resolution
# --------------------------------------------------------------------------- #

def build_exercise_map(cur) -> dict:
    """name (lower) -> id"""
    cur.execute("SELECT id, name FROM exercises")
    return {name.lower().strip(): eid for eid, name in cur.fetchall()}


def ensure_exercise(cur, name: str, ex_map: dict, is_custom=0, muscle_group=None, equipment=None) -> int:
    key = name.lower().strip()
    if key in ex_map:
        return ex_map[key]
    cur.execute(
        "INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_hidden, created_at) "
        "VALUES (?, ?, ?, ?, 0, ?)",
        (name.strip(), muscle_group, equipment, is_custom, now_iso()),
    )
    eid = cur.lastrowid
    ex_map[key] = eid
    print(f"  + exercise: {name!r} (id={eid}, custom={is_custom})")
    return eid


# --------------------------------------------------------------------------- #
#  custom exercises
# --------------------------------------------------------------------------- #

def import_custom_exercises(sections, cur, ex_map):
    body = sections.get("CUSTOM EXERCISES", "")
    tables = split_subtables(body)
    count = 0
    for rows in tables:
        for row in rows:
            name = (row.get("name") or row.get("exercisename") or "").strip()
            if not name:
                continue
            muscle = row.get("muscle_group") or row.get("bodypart") or None
            equip = row.get("equipment") or None
            ensure_exercise(cur, name, ex_map, is_custom=1, muscle_group=muscle, equipment=equip)
            count += 1
    print(f"Custom exercises processed: {count}")


# --------------------------------------------------------------------------- #
#  routine import
# --------------------------------------------------------------------------- #

def parse_routines_section(sections) -> dict:
    """
    Returns dict keyed by jefit routine _id:
    {
      'id': str,
      'name': str,
      'days': { jefit_day_id: {'number': int, 'name': str, 'exercises': []} }
    }
    """
    body = sections.get("ROUTINES", "")
    tables = split_subtables(body)

    routines = {}   # jefit_routine_id -> {...}
    # days keyed by jefit_day_id -> {routine_id, number, name, exercises:[]}
    days = {}

    for rows in tables:
        if not rows:
            continue
        first = rows[0]
        keys = set(first.keys())

        # Routine definition table: has '_id', 'name', 'dayaweek'
        if "_id" in keys and "dayaweek" in keys and "package" not in keys:
            for row in rows:
                rid = (row.get("_id") or "").strip()
                name = (row.get("name") or "").strip()
                if rid and name:
                    routines[rid] = {"id": rid, "name": name, "days": {}}

        # Day table: has 'package', 'day', 'dayIndex'
        elif "package" in keys and "day" in keys:
            for row in rows:
                pkg = (row.get("package") or "").strip()   # = routine _id
                day_id = (row.get("_id") or "").strip()
                day_name = (row.get("name") or "").strip()
                day_num_str = (row.get("day") or row.get("dayIndex") or "0").strip()
                try:
                    day_num = int(day_num_str)
                except ValueError:
                    day_num = 0
                rest = (row.get("rest_day") or "0").strip() == "1"
                if pkg and day_id:
                    days[day_id] = {
                        "routine_id": pkg,
                        "number": day_num,
                        "name": day_name,
                        "is_rest": rest,
                        "exercises": [],
                    }

        # Exercise table: has 'belongplan' (= day_id), 'exercisename', 'setcount'
        elif "belongplan" in keys and "exercisename" in keys:
            for row in rows:
                day_id = (row.get("belongplan") or "").strip()
                ex_name = (row.get("exercisename") or "").strip()
                sets_str = (row.get("setcount") or "4").strip()
                timer_str = (row.get("timer") or "60").strip()
                sort_str = (row.get("sort_order") or "0").strip()
                logs_str = (row.get("logs") or "").strip()  # last logged sets

                try:
                    sets = int(sets_str)
                except ValueError:
                    sets = 4
                try:
                    sort_order = int(sort_str)
                except ValueError:
                    sort_order = 0

                # Parse last logged weights/reps for default_weight and target_reps
                default_weight = None
                target_reps = None
                if logs_str:
                    set_entries = [s.strip() for s in logs_str.split(",") if s.strip()]
                    reps_list = []
                    weights = []
                    for entry in set_entries:
                        m = re.match(r"([\d.]+)x([\d.]+)", entry)
                        if m:
                            weights.append(float(m.group(1)))
                            reps_list.append(m.group(2))
                    if weights:
                        # Use average of logged weights as default suggestion
                        default_weight = round(sum(weights) / len(weights), 1)
                    if reps_list:
                        target_reps = ",".join(reps_list)

                if day_id and ex_name:
                    if day_id in days:
                        days[day_id]["exercises"].append({
                            "name": ex_name,
                            "sets": sets,
                            "sort_order": sort_order,
                            "default_weight": default_weight,
                            "target_reps": target_reps,
                        })

    # Attach days to routines
    for day_id, day in days.items():
        rid = day["routine_id"]
        if rid in routines:
            routines[rid]["days"][day_id] = day

    return routines


def import_routines(routines_data: dict, cur, ex_map, active_name: str):
    inserted_routines = {}  # jefit_id -> local_id

    # Deactivate all existing routines first
    cur.execute("UPDATE routines SET is_active = 0")

    for jefit_id, rdata in routines_data.items():
        rname = rdata["name"]
        is_active = 1 if rname == active_name else 0

        # Check if already exists
        cur.execute("SELECT id FROM routines WHERE name = ?", (rname,))
        existing = cur.fetchone()
        if existing:
            local_rid = existing[0]
            print(f"  = routine exists: {rname!r} (id={local_rid})")
            if is_active:
                cur.execute("UPDATE routines SET is_active = 1 WHERE id = ?", (local_rid,))
        else:
            cur.execute(
                "INSERT INTO routines (name, description, is_active, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (rname, None, is_active, now_iso(), now_iso()),
            )
            local_rid = cur.lastrowid
            print(f"  + routine: {rname!r} (id={local_rid}, active={is_active})")

        inserted_routines[jefit_id] = local_rid

        # Import days
        days_sorted = sorted(rdata["days"].values(), key=lambda d: d["number"])
        for day in days_sorted:
            day_num = day["number"]
            day_name = day["name"]

            cur.execute(
                "SELECT id FROM routine_days WHERE routine_id = ? AND day_number = ?",
                (local_rid, day_num),
            )
            ex_day = cur.fetchone()
            if ex_day:
                local_day_id = ex_day[0]
            else:
                cur.execute(
                    "INSERT INTO routine_days (routine_id, day_number, name) VALUES (?, ?, ?)",
                    (local_rid, day_num, day_name),
                )
                local_day_id = cur.lastrowid

            # Import exercises for this day
            for ex_entry in sorted(day["exercises"], key=lambda e: e["sort_order"]):
                ex_name = ex_entry["name"]
                local_ex_id = ensure_exercise(cur, ex_name, ex_map, is_custom=0)

                cur.execute(
                    "SELECT id FROM routine_day_exercises WHERE day_id = ? AND exercise_id = ?",
                    (local_day_id, local_ex_id),
                )
                if cur.fetchone():
                    continue  # already present

                cur.execute(
                    "INSERT INTO routine_day_exercises "
                    "(day_id, exercise_id, sort_order, default_sets, target_reps, default_weight) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (local_day_id, local_ex_id, ex_entry["sort_order"],
                     ex_entry["sets"], ex_entry["target_reps"], ex_entry["default_weight"]),
                )

        days_count = len(days_sorted)
        total_ex = sum(len(d["exercises"]) for d in days_sorted)
        print(f"    -> {days_count} days, {total_ex} exercises")

    return inserted_routines


# --------------------------------------------------------------------------- #
#  history import
# --------------------------------------------------------------------------- #

def parse_workout_sessions(sections) -> dict:
    """Returns dict: jefit session id -> {started_at, finished_at, notes}"""
    body = sections.get("WORKOUT SESSIONS", "")
    tables = split_subtables(body)
    sessions = {}
    for rows in tables:
        for row in rows:
            # Actual column name is '_id' (not 'rowid')
            sid = (row.get("_id") or row.get("id") or "").strip()
            start_ts = (row.get("starttime") or "").strip()
            end_ts = (row.get("endtime") or "").strip()
            note = (row.get("notes") or "").strip() or None

            started_at = None
            finished_at = None
            try:
                if start_ts and start_ts != "0":
                    started_at = datetime.fromtimestamp(int(start_ts), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                if end_ts and end_ts != "0":
                    finished_at = datetime.fromtimestamp(int(end_ts), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            except (ValueError, OSError):
                pass

            if sid and started_at:
                sessions[sid] = {
                    "started_at": started_at,
                    "finished_at": finished_at,
                    "notes": note,
                }
    return sessions


def parse_exercise_logs(sections) -> dict:
    """
    Returns dict: jefit session id -> list of {exercise_name, sets: [{weight, reps}]}
    Uses EXERCISE SET LOGS (granular) when available; falls back to EXERCISE LOGS.
    """
    # Try EXERCISE SET LOGS first (most granular)
    # Actual headers: _id,userid,exercise_log_id,set_index,weight_lbs,reps,...,log_time
    body_sets = sections.get("EXERCISE SET LOGS", "")
    tables_sets = split_subtables(body_sets)

    # jefit_exercise_log_id -> [{weight, reps, set_num}]  (no direct session link)
    set_logs = {}
    for rows in tables_sets:
        for row in rows:
            ex_log_id = (row.get("exercise_log_id") or "").strip()
            weight_str = (row.get("weight_lbs") or row.get("weight") or "0").strip()
            reps_str = (row.get("reps") or "0").strip()
            set_num_str = (row.get("set_index") or row.get("set_number") or "0").strip()
            session_id = ""  # not directly available in set logs

            try:
                weight = float(weight_str)
            except ValueError:
                weight = 0.0
            try:
                reps = int(reps_str)
            except ValueError:
                reps = 0
            try:
                set_num = int(set_num_str) + 1  # set_index is 0-based
            except ValueError:
                set_num = 1

            if ex_log_id:
                if ex_log_id not in set_logs:
                    set_logs[ex_log_id] = []
                set_logs[ex_log_id].append({
                    "weight": weight,
                    "reps": reps,
                    "set_number": set_num,
                })

    # EXERCISE LOGS: Actual headers: USERID,TIMESTAMP,belongSys,logs,_id,record,mydate,eid,ename,day_item_id,belongsession,logTime,...
    body_logs = sections.get("EXERCISE LOGS", "")
    tables_logs = split_subtables(body_logs)

    # session_id -> [{exercise_name, sets:[{weight,reps,set_number}]}]
    exercise_by_session = {}

    for rows in tables_logs:
        for row in rows:
            log_id = (row.get("_id") or "").strip()
            session_id = (row.get("belongsession") or row.get("session_log_id") or "").strip()
            ex_name = (row.get("ename") or row.get("exercisename") or row.get("exercise_name") or "").strip()
            logs_str = (row.get("logs") or "").strip()

            if not session_id or not ex_name:
                continue

            # Prefer granular set logs if we have them for this exercise log
            if log_id in set_logs:
                sets = sorted(set_logs[log_id], key=lambda s: s["set_number"])
            else:
                # Parse from logs_str "weightxreps,..."
                sets = []
                sn = 1
                for entry in [s.strip() for s in logs_str.split(",") if s.strip()]:
                    m = re.match(r"([\d.]+)x([\d.]+)", entry)
                    if m:
                        sets.append({"weight": float(m.group(1)), "reps": int(float(m.group(2))), "set_number": sn})
                        sn += 1

            if sets:
                if session_id not in exercise_by_session:
                    exercise_by_session[session_id] = []
                exercise_by_session[session_id].append({"exercise_name": ex_name, "sets": sets})

    return exercise_by_session


def import_history(workout_sessions: dict, exercise_by_session: dict, cur, ex_map):
    imported_sessions = 0
    imported_sets = 0
    skipped = 0

    # Track PRs: exercise_id -> max weight seen
    pr_map = {}

    for jefit_sid, sess_data in sorted(workout_sessions.items(), key=lambda x: x[1]["started_at"]):
        started_at = sess_data["started_at"]

        # Idempotency check
        cur.execute("SELECT id FROM workout_sessions WHERE started_at = ?", (started_at,))
        existing = cur.fetchone()
        if existing:
            skipped += 1
            continue

        finished_at = sess_data.get("finished_at")
        notes = sess_data.get("notes")

        cur.execute(
            "INSERT INTO workout_sessions (started_at, finished_at, notes) VALUES (?, ?, ?)",
            (started_at, finished_at, notes),
        )
        local_session_id = cur.lastrowid
        imported_sessions += 1

        # Log sets for this session
        ex_logs = exercise_by_session.get(jefit_sid, [])
        for ex_entry in ex_logs:
            ex_name = ex_entry["exercise_name"]
            local_ex_id = ensure_exercise(cur, ex_name, ex_map)

            for s in ex_entry["sets"]:
                weight = s["weight"]
                reps = s["reps"]
                set_num = s["set_number"]

                # PR detection
                is_pr = 0
                if weight > 0:
                    prev_max = pr_map.get(local_ex_id, 0.0)
                    if weight > prev_max:
                        is_pr = 1
                        pr_map[local_ex_id] = weight

                cur.execute(
                    "INSERT INTO session_sets "
                    "(session_id, exercise_id, set_number, weight, reps, is_warmup, is_pr, completed_at) "
                    "VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
                    (local_session_id, local_ex_id, set_num, weight, reps, is_pr, started_at),
                )
                imported_sets += 1

    print(f"\nHistory: {imported_sessions} sessions imported, {imported_sets} sets, {skipped} sessions skipped (already exist)")


# --------------------------------------------------------------------------- #
#  main
# --------------------------------------------------------------------------- #

def main():
    print(f"JEFIT importer")
    print(f"  CSV:  {CSV_PATH}")
    print(f"  DB:   {DB_PATH}")
    print()

    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found: {CSV_PATH}")
        sys.exit(1)

    print("Parsing CSV sections...")
    sections = parse_sections(CSV_PATH)
    print(f"  Found sections: {', '.join(sections.keys())}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    try:
        print("\n--- Custom exercises ---")
        ex_map = build_exercise_map(cur)
        import_custom_exercises(sections, cur, ex_map)

        print("\n--- Routines ---")
        ex_map = build_exercise_map(cur)  # refresh after custom exercises
        routines_data = parse_routines_section(sections)
        print(f"  Found {len(routines_data)} routines in CSV")
        import_routines(routines_data, cur, ex_map, ACTIVE_ROUTINE_NAME)

        print("\n--- Session history ---")
        ex_map = build_exercise_map(cur)  # refresh again
        workout_sessions = parse_workout_sessions(sections)
        print(f"  Found {len(workout_sessions)} workout sessions in CSV")
        exercise_by_session = parse_exercise_logs(sections)
        print(f"  Found exercise logs for {len(exercise_by_session)} sessions")
        import_history(workout_sessions, exercise_by_session, cur, ex_map)

        conn.commit()
        print("\nDone. Commit successful.")

        # Summary
        cur.execute("SELECT COUNT(*) FROM routines")
        print(f"\nDB summary:")
        print(f"  routines:        {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM routine_days")
        print(f"  routine_days:    {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM routine_day_exercises")
        print(f"  day_exercises:   {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM exercises")
        print(f"  exercises:       {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM workout_sessions")
        print(f"  sessions:        {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM session_sets")
        print(f"  sets:            {cur.fetchone()[0]}")
        cur.execute("SELECT name, is_active FROM routines ORDER BY is_active DESC, name")
        print(f"\nRoutines:")
        for row in cur.fetchall():
            flag = " [ACTIVE]" if row[1] else ""
            print(f"  {row[0]}{flag}")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
