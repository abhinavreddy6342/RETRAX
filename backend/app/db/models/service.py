from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.deployment import Deployment
    from app.db.models.incident import Incident
    from app.db.models.organization import Organization
    from app.db.models.runbook import Runbook
    from app.db.models.team import Team


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_team_id: Mapped[str | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    environment: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="production",
    )
    description: Mapped[str | None] = mapped_column(Text)
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
        back_populates="services",
    )

    owner_team: Mapped["Team | None"] = relationship(
        back_populates="services",
    )

    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="service",
    )

    deployments: Mapped[list["Deployment"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
    )

    runbooks: Mapped[list["Runbook"]] = relationship(
        back_populates="service",
    )

    __table_args__ = (
        Index(
            "ix_services_org_name",
            "organization_id",
            "name",
        ),
    )
