"""Tests for routine endpoints."""


def _create_routine(client, name="My Routine", description="Test routine"):
    resp = client.post("/routines/", json={"name": name, "description": description})
    assert resp.status_code == 201
    return resp.json()


def test_create_and_list_routines(client):
    r = _create_routine(client)
    assert r["name"] == "My Routine"
    resp = client.get("/routines/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_update_routine(client):
    r = _create_routine(client)
    resp = client.put(f"/routines/{r['id']}", json={"name": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_activate_routine(client):
    r = _create_routine(client)
    resp = client.post(f"/routines/{r['id']}/activate")
    assert resp.status_code == 200
    assert resp.json()["is_active"] == 1


def test_get_active_routine(client):
    r = _create_routine(client)
    client.post(f"/routines/{r['id']}/activate")
    active = client.get("/routines/active")
    assert active.status_code == 200
    assert active.json()["id"] == r["id"]


def test_no_active_routine_returns_404(client):
    resp = client.get("/routines/active")
    assert resp.status_code == 404


def test_add_day_to_routine(client):
    r = _create_routine(client)
    day_resp = client.post(f"/routines/{r['id']}/days", json={"day_number": 1, "name": "Push A"})
    assert day_resp.status_code == 201
    assert day_resp.json()["day_number"] == 1


def test_add_exercise_to_day(client):
    r = _create_routine(client)
    day = client.post(f"/routines/{r['id']}/days", json={"day_number": 1}).json()
    # Get a valid exercise id
    exercises = client.get("/exercises/").json()
    ex_id = exercises[0]["id"]
    resp = client.post(f"/routines/days/{day['id']}/exercises", json={
        "exercise_id": ex_id,
        "default_sets": 4,
        "target_reps": "8,8,8,12",
    })
    assert resp.status_code == 201
    assert resp.json()["exercise_id"] == ex_id


def test_delete_routine(client):
    r = _create_routine(client)
    del_resp = client.delete(f"/routines/{r['id']}")
    assert del_resp.status_code == 204
    routines = client.get("/routines/").json()
    assert not any(rt["id"] == r["id"] for rt in routines)
