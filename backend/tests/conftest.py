import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("APP_SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")


@pytest.fixture
async def client():
    from devagent.app import create_app

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
