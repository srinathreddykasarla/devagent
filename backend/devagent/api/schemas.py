from __future__ import annotations

from pydantic import BaseModel


class TaskCreateRequest(BaseModel):
    name: str
    pipeline: str
    trigger_type: str = "manual"
    trigger_config: dict = {}
    params: dict = {}
    enabled: bool = True
    notify_on: list[str] = ["failure"]


class TaskUpdateRequest(BaseModel):
    name: str | None = None
    pipeline: str | None = None
    trigger_type: str | None = None
    trigger_config: dict | None = None
    params: dict | None = None
    enabled: bool | None = None
    notify_on: list[str] | None = None


class PipelineRunRequest(BaseModel):
    params: dict = {}
