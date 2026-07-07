"""SQLAlchemy ORM models.

Schema overview
---------------
users          1 ──< meetings      (a user hosts many meetings)
meetings       1 ──< participants  (a meeting has many participants)
users          1 ──< participants  (a user can appear in many meetings; nullable for guests)
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#0E72ED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    hosted_meetings: Mapped[list["Meeting"]] = relationship(back_populates="host")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Zoom-style numeric meeting id, e.g. "83412907561" (rendered as 834 1290 7561)
    meeting_code: Mapped[str] = mapped_column(String(11), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    passcode: Mapped[str] = mapped_column(String(10), nullable=False)

    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    host: Mapped[User] = relationship(back_populates="hosted_meetings")

    # 'instant' meetings start immediately; 'scheduled' have a future start time
    meeting_type: Mapped[str] = mapped_column(String(10), default="instant")
    # lifecycle: waiting -> active -> ended
    status: Mapped[str] = mapped_column(String(10), default="waiting")

    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=40)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    # null user_id = guest who joined with only a display name
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)

    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    user: Mapped[User | None] = relationship()
