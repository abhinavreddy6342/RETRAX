from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.incident import Incident
    from app.db.models.organization import Organization


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    actor: Mapped[str | None] = mapped_column(String(150))
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )
    audit_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    organization: Mapped["Organization"] = relationship(
        back_populates="audit_events",
    )

    incident: Mapped["Incident | None"] = relationship(
        back_populates="audit_events",
    )
