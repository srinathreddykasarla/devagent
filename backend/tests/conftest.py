import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("APP_SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")


@pytest.fixture
async def client():
    # Reset database module state so each test gets a fresh DB
    import devagent.database as db_mod

    db_mod._engine = None
    db_mod._session_factory = None

    from devagent.app import create_app

    app = create_app()
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
