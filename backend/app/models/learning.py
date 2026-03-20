from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class LearningSession(Base):
    """Learning session tracking the full pipeline from search to final artifacts.

    Each session is a 'run' identified by its id. All artifacts are stored
    under output/session_{id}/.
    """

    __tablename__ = "learning_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic: Mapped[str] = mapped_column(String(500), nullable=False)

    # Pipeline status: searching -> generating -> content_ready -> images_done
    #   -> audio_done -> video_done -> complete | error
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="searching")

    # Step 1: Firecrawl search results
    search_results: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Step 2: LLM-synthesized structured content
    generated_content: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Step 3: Generated image paths (list of paths relative to session dir)
    image_paths: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Step 4: Generated narration audio path
    audio_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Step 5: Word-level alignment data from Whisper
    alignment: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Step 6: Rendered video path
    video_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Step 7: Generated slides path
    slides_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Key concepts the user learned in this session (extracted by LLM)
    concepts_learned: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Per-session image style override
    image_style: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Error tracking
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", lazy="select")

    @property
    def output_dir(self) -> str:
        """Directory for all session artifacts: output/session_{id}/"""
        return f"output/session_{self.id}"
