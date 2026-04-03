import pytest

from devagent.core.event_bus import EventBus


@pytest.mark.asyncio
async def test_publish_subscribe():
    bus = EventBus()
    received = []

    async def handler(msg):
        received.append(msg)

    await bus.subscribe("test", handler)
    await bus.publish("test", {"data": "hello"})
    assert len(received) == 1
    assert received[0]["data"] == "hello"


@pytest.mark.asyncio
async def test_unsubscribe():
    bus = EventBus()
    received = []

    async def handler(msg):
        received.append(msg)

    await bus.subscribe("test", handler)
    await bus.unsubscribe("test", handler)
    await bus.publish("test", {"data": "hello"})
    assert len(received) == 0


@pytest.mark.asyncio
async def test_multiple_subscribers():
    bus = EventBus()
    results_a = []
    results_b = []

    async def handler_a(msg):
        results_a.append(msg)

    async def handler_b(msg):
        results_b.append(msg)

    await bus.subscribe("ch", handler_a)
    await bus.subscribe("ch", handler_b)
    await bus.publish("ch", {"x": 1})
    assert len(results_a) == 1
    assert len(results_b) == 1


@pytest.mark.asyncio
async def test_publish_to_empty_channel():
    bus = EventBus()
    await bus.publish("nobody-listening", {"x": 1})  # should not raise


@pytest.mark.asyncio
async def test_callback_error_doesnt_break_others():
    bus = EventBus()
    good_results = []

    async def bad_handler(msg):
        raise ValueError("boom")

    async def good_handler(msg):
        good_results.append(msg)

    await bus.subscribe("ch", bad_handler)
    await bus.subscribe("ch", good_handler)
    await bus.publish("ch", {"x": 1})
    assert len(good_results) == 1
