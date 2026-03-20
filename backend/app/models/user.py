from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """User model for the personalized learning platform."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    learning_style: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="visual",
        comment="One of: visual, auditory, reading, kinesthetic",
    )
    expertise_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="beginner",
        comment="One of: beginner, intermediate, advanced",
    )
    perspective: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
        comment="Optional text describing the user's viewpoint or role",
    )
    age_group: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="One of: primary (6-11), secondary (12-17), adult (18+)",
    )
    goal: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="One of: curiosity, exam_prep, homework, career",
    )
    image_style: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Default visual style preference, e.g. cartoon, watercolor, photorealistic",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
