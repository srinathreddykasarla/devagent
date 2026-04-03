import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_list_tasks_returns_empty(client):
    resp = await client.get("/api/tasks/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_runs_returns_empty(client):
    resp = await client.get("/api/runs/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_plugins_returns_empty(client):
    resp = await client.get("/api/plugins/")
    assert resp.status_code == 200
    assert resp.json() == []
