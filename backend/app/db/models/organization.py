from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.audit import AuditEvent
    from app.db.models.evaluation import Evaluation
    from app.db.models.incident import Incident
    from app.db.models.runbook import Runbook
    from app.db.models.service import Service
    from app.db.models.team import Team
    from app.db.models.user import User


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    users: Mapped[list["User"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    teams: Mapped[list["Team"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    services: Mapped[list["Service"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    runbooks: Mapped[list["Runbook"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    audit_events: Mapped[list["AuditEvent"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
    )
