from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.hypothesis import Hypothesis
    from app.db.models.incident import Incident
    from app.db.models.runbook import Runbook


class InvestigationAction(Base):
    __tablename__ = "investigation_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    runbook_id: Mapped[str | None] = mapped_column(
        ForeignKey("runbooks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    hypothesis_id: Mapped[str | None] = mapped_column(
        ForeignKey("hypotheses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str | None] = mapped_column(String(150))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )
    result: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(Text)
    evidence: Mapped[list[Any] | None] = mapped_column(JSON)
    action_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    incident: Mapped["Incident"] = relationship(
        back_populates="investigation_actions",
    )

    runbook: Mapped["Runbook | None"] = relationship(
        back_populates="investigation_actions",
    )
