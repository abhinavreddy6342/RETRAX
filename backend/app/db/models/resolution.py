from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.incident import Incident


class Resolution(Base):
    __tablename__ = "resolutions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    resolution: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="SUCCESS",
    )
    successful_actions: Mapped[list[Any] | None] = mapped_column(JSON)
    failed_actions: Mapped[list[Any] | None] = mapped_column(JSON)
    resolved_by: Mapped[str | None] = mapped_column(String(150))
    resolved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    incident: Mapped["Incident"] = relationship(
        back_populates="resolution",
    )
