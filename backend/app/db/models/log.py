from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


if TYPE_CHECKING:
    from app.db.models.incident import Incident


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )
    source: Mapped[str | None] = mapped_column(String(100))
    level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="INFO",
        index=True,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    log_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    incident: Mapped["Incident"] = relationship(
        back_populates="logs",
    )