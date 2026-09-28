from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.incident import Incident


class Postmortem(Base):
    __tablename__ = "postmortems"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    summary: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str | None] = mapped_column(Text)
    timeline: Mapped[list[Any] | None] = mapped_column(JSON)
    root_cause: Mapped[str | None] = mapped_column(Text)
    contributing_factors: Mapped[list[Any] | None] = mapped_column(JSON)
    successful_actions: Mapped[list[Any] | None] = mapped_column(JSON)
    failed_actions: Mapped[list[Any] | None] = mapped_column(JSON)
    preventive_actions: Mapped[list[Any] | None] = mapped_column(JSON)
    lessons_learned: Mapped[list[Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    incident: Mapped["Incident"] = relationship(
        back_populates="postmortem",
    )
