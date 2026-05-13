"""Tests for progress and analytics endpoints."""


def _log_complete_session(client, exercise_id, sets):
    """Helper: start a session, log sets, finish it. sets = [(weight, reps)]"""
    session = client.post("/sessions/start", json={}).json()
    for i, (weight, reps) in enumerate(sets, start=1):
        client.post(f"/sessions/{session['id']}/sets", json={
            "exercise_id": exercise_id,
            "set_number": i,
            "weight": weight,
            "reps": reps,
        })
    client.post(f"/sessions/{session['id']}/finish", json={})
    return session


def _exercise_id(client):
    return client.get("/exercises/").json()[0]["id"]


def test_prs_endpoint(client):
    ex_id = _exercise_id(client)
    _log_complete_session(client, ex_id, [(135.0, 5)])
    resp = client.get("/progress/prs")
    assert resp.status_code == 200
    prs = resp.json()
    assert len(prs) >= 1
    assert prs[0]["exercise_id"] == ex_id


def test_volume_endpoint(client):
    ex_id = _exercise_id(client)
    _log_complete_session(client, ex_id, [(100.0, 10), (100.0, 10), (100.0, 8)])
    resp = client.get("/progress/volume")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    # 100*10 + 100*10 + 100*8 = 2800
    assert data[0]["total_volume_lbs"] == 2800.0


def test_exercise_progress_endpoint(client):
    ex_id = _exercise_id(client)
    _log_complete_session(client, ex_id, [(100.0, 10)])
    _log_complete_session(client, ex_id, [(110.0, 8)])
    resp = client.get(f"/progress/exercises/{ex_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    # Newest first
    assert data[0]["weight"] == 110.0


def test_overload_suggestions_endpoint(client):
    r = client.post("/routines/", json={"name": "Test"}).json()
    day = client.post(f"/routines/{r['id']}/days", json={"day_number": 1}).json()
    ex_id = _exercise_id(client)
    client.post(f"/routines/days/{day['id']}/exercises", json={"exercise_id": ex_id})
    # Log 2 sessions so we have comparison history
    _log_complete_session(client, ex_id, [(100.0, 10)])
    _log_complete_session(client, ex_id, [(100.0, 10)])
    resp = client.get(f"/progress/overload/{day['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["exercise_id"] == ex_id
    # Should suggest increase
    assert data[0]["suggested_weight"] == 102.5
