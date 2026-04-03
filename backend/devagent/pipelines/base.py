from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BasePipeline(ABC):
    """Abstract base for all pipelines."""

    name: str
    description: str

    @abstractmethod
    async def run(self, params: dict[str, Any]) -> dict[str, Any]:
        """Execute the pipeline with given parameters. Returns result dict."""
