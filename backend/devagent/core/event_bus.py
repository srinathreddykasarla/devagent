from __future__ import annotations

import logging
from collections import defaultdict
from typing import Callable

logger = logging.getLogger(__name__)


class EventBus:
    """In-memory event bus for log streaming. Can be replaced with Redis pub/sub later."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)

    async def publish(self, channel: str, message: dict) -> None:
        for callback in self._subscribers.get(channel, []):
            try:
                await callback(message)
            except Exception as e:
                logger.warning("Event bus callback error on '%s': %s", channel, e)

    async def subscribe(self, channel: str, callback: Callable) -> None:
        self._subscribers[channel].append(callback)

    async def unsubscribe(self, channel: str, callback: Callable) -> None:
        subs = self._subscribers.get(channel, [])
        if callback in subs:
            subs.remove(callback)
