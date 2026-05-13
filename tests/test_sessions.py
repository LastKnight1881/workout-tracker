"""Tests for session and set logging endpoints."""


def _exercise_id(client):
    return client.get("/exercises/").json()[0]["id"]


def _start_session(client, **kwargs):
    resp = client.post("/sessions/start", json=kwargs)
    assert resp.status_code == 201
    return resp.json()


def test_start_and_get_session(client):
    session = _start_session(client)
    assert session["id"] is not None
    resp = client.get(f"/sessions/{session['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == session["id"]


def test_log_set(client):
    session = _start_session(client)
    ex_id = _exercise_id(client)
    resp = client.post(f"/sessions/{session['id']}/sets", json={
        "exercise_id": ex_id,
        "set_number": 1,
        "weight": 135.0,
        "reps": 8,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["weight"] == 135.0
    assert data["reps"] == 8


def test_first_set_is_pr(client):
    session = _start_session(client)
    ex_id = _exercise_id(client)
    resp = client.post(f"/sessions/{session['id']}/sets", json={
        "exercise_id": ex_id, "set_number": 1, "weight": 100.0, "reps": 10,
    })
    assert resp.json()["is_pr"] == 1


def test_lighter_set_is_not_pr(client):
    # Log a heavy set, finish session, start new one, log lighter
    s1 = _start_session(client)
    ex_id = _exercise_id(client)
    client.post(f"/sessions/{s1['id']}/sets", json={"exercise_id": ex_id, "set_number": 1, "weight": 200.0, "reps": 5})
    client.post(f"/sessions/{s1['id']}/finish", json={})
    s2 = _start_session(client)
    resp = client.post(f"/sessions/{s2['id']}/sets", json={"exercise_id": ex_id, "set_number": 1, "weight": 150.0, "reps": 5})
    assert resp.json()["is_pr"] == 0


def test_finish_session(client):
    session = _start_session(client)
    resp = client.post(f"/sessions/{session['id']}/finish", json={"notes": "Good session", "bodyweight": 175.0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["finished_at"] is not None
    assert data["notes"] == "Good session"
    assert data["bodyweight"] == 175.0


def test_delete_set(client):
    session = _start_session(client)
    ex_id = _exercise_id(client)
    set_resp = client.post(f"/sessions/{session['id']}/sets", json={"exercise_id": ex_id, "set_number": 1, "weight": 100.0, "reps": 5})
    set_id = set_resp.json()["id"]
    del_resp = client.delete(f"/sessions/{session['id']}/sets/{set_id}")
    assert del_resp.status_code == 204


def test_update_set(client):
    session = _start_session(client)
    ex_id = _exercise_id(client)
    set_resp = client.post(f"/sessions/{session['id']}/sets", json={"exercise_id": ex_id, "set_number": 1, "weight": 100.0, "reps": 5})
    set_id = set_resp.json()["id"]
    update_resp = client.put(f"/sessions/{session['id']}/sets/{set_id}", json={"reps": 8})
    assert update_resp.status_code == 200
    assert update_resp.json()["reps"] == 8


def test_get_last_sets(client):
    s1 = _start_session(client)
    ex_id = _exercise_id(client)
    client.post(f"/sessions/{s1['id']}/sets", json={"exercise_id": ex_id, "set_number": 1, "weight": 100.0, "reps": 5})
    client.post(f"/sessions/{s1['id']}/sets", json={"exercise_id": ex_id, "set_number": 2, "weight": 110.0, "reps": 4})
    client.post(f"/sessions/{s1['id']}/finish", json={})
    resp = client.get(f"/sessions/exercises/{ex_id}/last")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_list_sessions(client):
    _start_session(client)
    _start_session(client)
    resp = client.get("/sessions/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
