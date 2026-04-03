import pytest


@pytest.mark.asyncio
async def test_list_runs_empty(client):
    resp = await client.get("/api/runs/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_nonexistent_run(client):
    resp = await client.get("/api/runs/nonexistent")
    assert resp.status_code == 404
