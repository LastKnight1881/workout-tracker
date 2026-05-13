"""Tests for exercise endpoints."""


def test_list_exercises_returns_seeded_data(client):
    resp = client.get("/exercises/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    names = [e["name"] for e in data]
    assert "Bench Press (Barbell)" in names


def test_list_exercises_filter_by_muscle(client):
    resp = client.get("/exercises/?muscle_group=Chest")
    assert resp.status_code == 200
    data = resp.json()
    assert all(e["muscle_group"] == "Chest" for e in data)
    assert len(data) > 0


def test_create_custom_exercise(client):
    resp = client.post("/exercises/", json={"name": "My Custom Move", "muscle_group": "Arms", "equipment": "BW"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Custom Move"
    assert data["is_custom"] == 1


def test_update_custom_exercise(client):
    # First create one
    create_resp = client.post("/exercises/", json={"name": "Temp Exercise", "muscle_group": "Core"})
    ex_id = create_resp.json()["id"]
    update_resp = client.put(f"/exercises/{ex_id}", json={"name": "Updated Exercise"})
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Exercise"


def test_cannot_update_builtin_exercise(client):
    # Get a built-in exercise
    exercises = client.get("/exercises/").json()
    builtin = next(e for e in exercises if e["is_custom"] == 0)
    resp = client.put(f"/exercises/{builtin['id']}", json={"name": "Hacked"})
    assert resp.status_code == 403


def test_delete_custom_exercise(client):
    create_resp = client.post("/exercises/", json={"name": "To Delete"})
    ex_id = create_resp.json()["id"]
    del_resp = client.delete(f"/exercises/{ex_id}")
    assert del_resp.status_code == 204
    # Should not appear in list
    exercises = client.get("/exercises/").json()
    assert not any(e["id"] == ex_id for e in exercises)


def test_delete_builtin_exercise_hides_it(client):
    exercises = client.get("/exercises/").json()
    builtin = next(e for e in exercises if e["is_custom"] == 0)
    del_resp = client.delete(f"/exercises/{builtin['id']}")
    assert del_resp.status_code == 204
    exercises_after = client.get("/exercises/").json()
    assert not any(e["id"] == builtin["id"] for e in exercises_after)


def test_filter_custom_only(client):
    client.post("/exercises/", json={"name": "My Custom 1"})
    resp = client.get("/exercises/?custom_only=true")
    assert resp.status_code == 200
    data = resp.json()
    assert all(e["is_custom"] == 1 for e in data)
    assert len(data) >= 1
