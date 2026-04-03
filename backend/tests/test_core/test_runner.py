import pytest

from devagent.core.event_bus import EventBus
from devagent.core.runner import run_pipeline
from devagent.models import RunStatus
from devagent.pipelines.base import BasePipeline
from devagent.pipelines.registry import PipelineRegistry


class SuccessPipeline(BasePipeline):
    name = "success"
    description = "Always succeeds"

    async def run(self, params):
        return {"result": "done"}


class FailPipeline(BasePipeline):
    name = "fail"
    description = "Always fails"

    async def run(self, params):
        raise RuntimeError("Pipeline exploded")


@pytest.fixture
def pipeline_registry():
    registry = PipelineRegistry()
    registry.register(SuccessPipeline())
    registry.register(FailPipeline())
    return registry


@pytest.fixture
async def db_session():
    """Create a real async session for testing."""
    from devagent.database import get_db, init_db

    await init_db("sqlite+aiosqlite://")
    async for session in get_db():
        yield session


@pytest.mark.asyncio
async def test_run_pipeline_success(pipeline_registry, db_session):
    event_bus = EventBus()
    run = await run_pipeline(
        pipeline_name="success",
        params={"key": "value"},
        task_id="test-task",
        pipelines=pipeline_registry,
        db=db_session,
        event_bus=event_bus,
    )
    assert run.status == RunStatus.SUCCESS
    assert run.result == {"result": "done"}
    assert run.error is None
    assert run.finished_at is not None


@pytest.mark.asyncio
async def test_run_pipeline_failure(pipeline_registry, db_session):
    run = await run_pipeline(
        pipeline_name="fail",
        params={},
        task_id="test-task",
        pipelines=pipeline_registry,
        db=db_session,
    )
    assert run.status == RunStatus.FAILED
    assert "exploded" in run.error
    assert run.finished_at is not None


@pytest.mark.asyncio
async def test_run_pipeline_retry(pipeline_registry, db_session):
    run = await run_pipeline(
        pipeline_name="fail",
        params={},
        task_id="test-task",
        pipelines=pipeline_registry,
        db=db_session,
        max_retries=2,
    )
    assert run.status == RunStatus.FAILED
    assert run.retry_count == 3  # initial + 2 retries


@pytest.mark.asyncio
async def test_run_pipeline_logs_streamed(pipeline_registry, db_session):
    event_bus = EventBus()
    received = []

    async def capture(msg):
        received.append(msg)

    await event_bus.subscribe("run:test:logs", capture)

    run = await run_pipeline(
        pipeline_name="success",
        params={},
        task_id="test-task",
        pipelines=pipeline_registry,
        db=db_session,
        event_bus=event_bus,
    )
    assert len(run.logs) >= 2  # at least "Starting" and "completed"
