import pytest


@pytest.mark.asyncio
async def test_create_task(client):
    resp = await client.post(
        "/api/tasks/",
        json={
            "name": "Test Task",
            "pipeline": "jira_to_pr",
            "trigger_type": "manual",
            "params": {"ticket_id": "TEST-1"},
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Task"
    assert data["pipeline"] == "jira_to_pr"
    assert data["id"]  # should have a generated ID
    return data["id"]


@pytest.mark.asyncio
async def test_list_tasks_after_create(client):
    # Create a task first
    await client.post("/api/tasks/", json={"name": "T1", "pipeline": "p1"})
    resp = await client.get("/api/tasks/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_task_by_id(client):
    create_resp = await client.post("/api/tasks/", json={"name": "T2", "pipeline": "p2"})
    task_id = create_resp.json()["id"]
    resp = await client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "T2"


@pytest.mark.asyncio
async def test_update_task(client):
    create_resp = await client.post("/api/tasks/", json={"name": "T3", "pipeline": "p3"})
    task_id = create_resp.json()["id"]
    resp = await client.put(f"/api/tasks/{task_id}", json={"name": "T3 Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "T3 Updated"


@pytest.mark.asyncio
async def test_delete_task(client):
    create_resp = await client.post("/api/tasks/", json={"name": "T4", "pipeline": "p4"})
    task_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    # Verify it's gone
    get_resp = await client.get(f"/api/tasks/{task_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_task(client):
    resp = await client.get("/api/tasks/nonexistent")
    assert resp.status_code == 404
