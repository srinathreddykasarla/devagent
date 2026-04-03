import pytest


@pytest.mark.asyncio
async def test_list_pipelines(client):
    resp = await client.get("/api/pipelines/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_run_nonexistent_pipeline(client):
    resp = await client.post("/api/pipelines/nonexistent/run", json={"params": {}})
    assert resp.status_code in [404, 503]  # 503 if no pipeline registry, 404 if not found
