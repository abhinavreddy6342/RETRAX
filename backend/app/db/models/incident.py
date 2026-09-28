from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.audit import AuditEvent
    from app.db.models.deployment import Deployment
    from app.db.models.evaluation import Evaluation
    from app.db.models.hypothesis import Hypothesis
    from app.db.models.incident_event import IncidentEvent
    from app.db.models.investigation_action import InvestigationAction
    from app.db.models.log import Log
    from app.db.models.organization import Organization
    from app.db.models.postmortem import Postmortem
    from app.db.models.resolution import Resolution
    from app.db.models.service import Service
    from app.db.models.user import User


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    incident_key: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_to: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    deployment_id: Mapped[str | None] = mapped_column(
        ForeignKey("deployments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SEV-3",
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DETECTED",
        index=True,
    )
    environment: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="production",
    )
    current_error: Mapped[str | None] = mapped_column(Text)
    impact: Mapped[str | None] = mapped_column(Text)
    root_cause: Mapped[str | None] = mapped_column(Text)
    resolution_summary: Mapped[str | None] = mapped_column(Text)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
        back_populates="incidents",
    )

    service: Mapped["Service"] = relationship(
        back_populates="incidents",
    )

    assignee: Mapped["User | None"] = relationship(
        back_populates="assigned_incidents",
        foreign_keys=[assigned_to],
    )

    deployment: Mapped["Deployment | None"] = relationship(
        back_populates="incidents",
    )

    events: Mapped[list["IncidentEvent"]] = relationship(
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="IncidentEvent.timestamp",
    )

    logs: Mapped[list["Log"]] = relationship(
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="Log.timestamp",
    )

    hypotheses: Mapped[list["Hypothesis"]] = relationship(
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="Hypothesis.created_at",
    )

    investigation_actions: Mapped[list["InvestigationAction"]] = relationship(
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="InvestigationAction.timestamp",
    )

    resolution: Mapped["Resolution | None"] = relationship(
        back_populates="incident",
        uselist=False,
        cascade="all, delete-orphan",
    )

    postmortem: Mapped["Postmortem | None"] = relationship(
        back_populates="incident",
        uselist=False,
        cascade="all, delete-orphan",
    )

    audit_events: Mapped[list["AuditEvent"]] = relationship(
        back_populates="incident",
    )

    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="incident",
    )

    __table_args__ = (
        Index(
            "ix_incidents_org_status",
            "organization_id",
            "status",
        ),
        Index(
            "ix_incidents_service_started",
            "service_id",
            "started_at",
        ),
    )
