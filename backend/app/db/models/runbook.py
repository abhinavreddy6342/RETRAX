from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.investigation_action import InvestigationAction
    from app.db.models.organization import Organization
    from app.db.models.service import Service


class Runbook(Base):
    __tablename__ = "runbooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[str | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    runbook_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    steps: Mapped[list[Any] | None] = mapped_column(JSON)
    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        back_populates="runbooks",
    )

    service: Mapped["Service | None"] = relationship(
        back_populates="runbooks",
    )

    investigation_actions: Mapped[list["InvestigationAction"]] = relationship(
        back_populates="runbook",
    )
