"""Seed the database with the default user and sample meetings."""
import random
import secrets
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from . import models
from .database import SessionLocal


def _code() -> str:
    return str(random.randint(1, 9)) + "".join(random.choices(string.digits, k=10))


def _passcode() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=6))


def seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(models.Meeting)):
            return  # already seeded

        user = db.scalar(select(models.User).where(models.User.email == "wakode333nikhil@gmail.com"))
        if not user:
            user = models.User(
                name="Nikhil Wakode",
                email="wakode333nikhil@gmail.com",
                avatar_color="#0E72ED",
            )
            db.add(user)
            db.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        upcoming = [
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="Sprint Planning", description="Plan tasks for the next sprint cycle.",
                meeting_type="scheduled", status="waiting",
                scheduled_at=now + timedelta(hours=3), duration_minutes=45,
            ),
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="Design Review — Dashboard v2",
                description="Walk through the new dashboard mockups with the design team.",
                meeting_type="scheduled", status="waiting",
                scheduled_at=now + timedelta(days=1, hours=2), duration_minutes=60,
            ),
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="1:1 with Mentor", description="Weekly sync-up and feedback session.",
                meeting_type="scheduled", status="waiting",
                scheduled_at=now + timedelta(days=2, hours=5), duration_minutes=30,
            ),
        ]

        recent = [
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="Daily Standup", meeting_type="scheduled", status="ended",
                scheduled_at=now - timedelta(days=1, hours=4), duration_minutes=15,
                started_at=now - timedelta(days=1, hours=4),
                ended_at=now - timedelta(days=1, hours=3, minutes=45),
                created_at=now - timedelta(days=2),
            ),
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="Nikhil Wakode's Zoom Meeting", meeting_type="instant", status="ended",
                started_at=now - timedelta(days=2, hours=1),
                ended_at=now - timedelta(days=2), duration_minutes=40,
                created_at=now - timedelta(days=2, hours=1),
            ),
            models.Meeting(
                meeting_code=_code(), passcode=_passcode(), host_key=secrets.token_hex(16), host_id=user.id,
                title="Project Kickoff — Video Platform",
                description="Kickoff call for the video conferencing project.",
                meeting_type="scheduled", status="ended",
                scheduled_at=now - timedelta(days=4), duration_minutes=60,
                started_at=now - timedelta(days=4),
                ended_at=now - timedelta(days=4) + timedelta(minutes=55),
                created_at=now - timedelta(days=5),
            ),
        ]

        for meeting in upcoming + recent:
            db.add(meeting)
        db.flush()

        # A couple of participant rows on past meetings so the schema demo has data
        standup = recent[0]
        for name, is_host in [("Nikhil Wakode", True), ("Priya Sharma", False), ("Rahul Verma", False)]:
            db.add(models.Participant(
                meeting_id=standup.id,
                user_id=user.id if is_host else None,
                display_name=name, is_host=is_host,
                joined_at=standup.started_at, left_at=standup.ended_at,
            ))

        db.commit()
    finally:
        db.close()
