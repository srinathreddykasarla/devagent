from __future__ import annotations

import logging

from devagent.pipelines.base import BasePipeline

logger = logging.getLogger(__name__)


class PipelineRegistry:
    def __init__(self) -> None:
        self._pipelines: dict[str, BasePipeline] = {}

    def register(self, pipeline: BasePipeline) -> None:
        self._pipelines[pipeline.name] = pipeline
        logger.info("Pipeline '%s' registered", pipeline.name)

    def get(self, name: str) -> BasePipeline:
        if name not in self._pipelines:
            raise KeyError(f"Pipeline '{name}' not found. Available: {list(self._pipelines.keys())}")
        return self._pipelines[name]

    def list_all(self) -> list[dict]:
        return [
            {"id": p.name, "name": p.name, "description": p.description}
            for p in self._pipelines.values()
        ]
