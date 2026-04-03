from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from devagent.models.task import Base


class PluginConfig(Base):
    __tablename__ = "plugin_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    plugin_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    config_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
