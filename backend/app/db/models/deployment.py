from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.incident import Incident
    from app.db.models.service import Service


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(String(100), nullable=False)
    environment: Mapped[str] = mapped_column(String(30), nullable=False)
    commit_sha: Mapped[str | None] = mapped_column(String(100))
    deployed_by: Mapped[str | None] = mapped_column(String(150))
    notes: Mapped[str | None] = mapped_column(Text)
    deployed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )

    service: Mapped["Service"] = relationship(
        back_populates="deployments",
    )

    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="deployment",
    )
