from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from devagent.models.task import Base


class PipelineDefinition(Base):
    """Prompt-driven pipeline definition stored in the database.

    A pipeline is just a name + description + system prompt + default params.
    It is executed by the orchestrator, which exposes plugin actions and the
    Claude Code agent as LLM tools.
    """

    __tablename__ = "pipeline_definitions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    default_params: Mapped[dict] = mapped_column(JSON, default=dict)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
