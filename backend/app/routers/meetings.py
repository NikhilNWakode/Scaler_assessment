"""REST endpoints for meetings: create, schedule, join, list, end."""
import random
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from .users import get_default_user

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_meeting_code(db: Session) -> str:
    """Generate a unique Zoom-style 11-digit meeting code."""
    while True:
        code = str(random.randint(1, 9)) + "".join(random.choices(string.digits, k=10))
        exists = db.scalar(select(models.Meeting).where(models.Meeting.meeting_code == code))
        if not exists:
            return code


def _generate_passcode() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=6))


def _normalize_code(meeting_code: str) -> str:
    """Accept codes pasted with spaces or dashes, e.g. '834 1290 7561'."""
    return meeting_code.replace(" ", "").replace("-", "")


def _get_meeting_or_404(db: Session, meeting_code: str) -> models.Meeting:
    meeting = db.scalar(
        select(models.Meeting)
        .options(joinedload(models.Meeting.host))
        .where(models.Meeting.meeting_code == _normalize_code(meeting_code))
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found. Check the meeting ID and try again.")
    return meeting


def _verify_host_key(meeting: models.Meeting, host_key: str) -> None:
    if not host_key or not secrets.compare_digest(meeting.host_key, host_key):
        raise HTTPException(status_code=403, detail="Only the meeting host can do this.")


@router.post("/instant", response_model=schemas.MeetingHostOut)
def create_instant_meeting(
    payload: schemas.InstantMeetingIn,
    db: Session = Depends(get_db),
):
    """Create a meeting that starts immediately and return it."""
    host = get_default_user(db)
    meeting = models.Meeting(
        meeting_code=_generate_meeting_code(db),
        title=payload.title or f"{host.name}'s Zoom Meeting",
        passcode=_generate_passcode(),
        host_key=secrets.token_hex(16),
        host_id=host.id,
        meeting_type="instant",
        status="active",
        started_at=_utcnow(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/schedule", response_model=schemas.MeetingHostOut)
def schedule_meeting(payload: schemas.ScheduleMeetingIn, db: Session = Depends(get_db)):
    """Create a scheduled meeting for a future date/time."""
    host = get_default_user(db)
    scheduled_at = payload.scheduled_at
    if scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    meeting = models.Meeting(
        meeting_code=_generate_meeting_code(db),
        title=payload.title,
        description=payload.description,
        passcode=_generate_passcode(),
        host_key=secrets.token_hex(16),
        host_id=host.id,
        meeting_type="scheduled",
        status="waiting",
        scheduled_at=scheduled_at,
        duration_minutes=payload.duration_minutes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/upcoming", response_model=list[schemas.MeetingHostOut])
def list_upcoming(db: Session = Depends(get_db)):
    """Scheduled meetings that haven't ended yet, soonest first."""
    cutoff = _utcnow() - timedelta(hours=1)
    return (
        db.scalars(
            select(models.Meeting)
            .options(joinedload(models.Meeting.host))
            .where(
                models.Meeting.meeting_type == "scheduled",
                models.Meeting.status != "ended",
                models.Meeting.scheduled_at >= cutoff,
            )
            .order_by(models.Meeting.scheduled_at.asc())
        )
        .all()
    )


@router.get("/recent", response_model=list[schemas.MeetingHostOut])
def list_recent(db: Session = Depends(get_db)):
    """Meetings that already happened (ended, or active instant ones), newest first."""
    return (
        db.scalars(
            select(models.Meeting)
            .options(joinedload(models.Meeting.host))
            .where(models.Meeting.status.in_(["active", "ended"]))
            .order_by(models.Meeting.created_at.desc())
            .limit(10)
        )
        .all()
    )


@router.get("/{meeting_code}", response_model=schemas.MeetingWithParticipants)
def get_meeting(meeting_code: str, db: Session = Depends(get_db)):
    """Validate a meeting exists and return its details."""
    meeting = _get_meeting_or_404(db, meeting_code)
    if meeting.status == "ended":
        raise HTTPException(status_code=410, detail="This meeting has ended.")
    return meeting


@router.post("/{meeting_code}/join", response_model=schemas.JoinMeetingOut)
def join_meeting(meeting_code: str, payload: schemas.JoinMeetingIn, db: Session = Depends(get_db)):
    """Register a participant (by display name) into a meeting."""
    meeting = _get_meeting_or_404(db, meeting_code)
    if meeting.status == "ended":
        raise HTTPException(status_code=410, detail="This meeting has ended.")

    host = get_default_user(db)
    is_host = meeting.host_id == host.id and payload.display_name.strip() == host.name

    # A scheduled meeting becomes active when the first person joins
    if meeting.status == "waiting":
        meeting.status = "active"
        meeting.started_at = _utcnow()

    participant = models.Participant(
        meeting_id=meeting.id,
        user_id=host.id if is_host else None,
        display_name=payload.display_name.strip(),
        is_host=is_host,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    db.refresh(meeting)
    return {"meeting": meeting, "participant": participant}


@router.post("/{meeting_code}/leave/{participant_id}", response_model=schemas.ParticipantOut)
def leave_meeting(meeting_code: str, participant_id: int, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_code)
    participant = db.get(models.Participant, participant_id)
    if not participant or participant.meeting_id != meeting.id:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting.")
    participant.left_at = _utcnow()
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{meeting_code}/end", response_model=schemas.MeetingOut)
def end_meeting(
    meeting_code: str, payload: schemas.HostKeyIn, db: Session = Depends(get_db)
):
    """End the meeting for everyone (host only)."""
    meeting = _get_meeting_or_404(db, meeting_code)
    _verify_host_key(meeting, payload.host_key)
    meeting.status = "ended"
    meeting.ended_at = _utcnow()
    now = _utcnow()
    for p in meeting.participants:
        if p.left_at is None:
            p.left_at = now
    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_code}", response_model=schemas.MeetingOut)
def delete_scheduled_meeting(
    meeting_code: str, host_key: str = "", db: Session = Depends(get_db)
):
    """Cancel a scheduled meeting from the dashboard (host only)."""
    meeting = _get_meeting_or_404(db, meeting_code)
    _verify_host_key(meeting, host_key)
    if meeting.meeting_type != "scheduled" or meeting.status == "ended":
        raise HTTPException(status_code=400, detail="Only upcoming scheduled meetings can be cancelled.")
    meeting.status = "ended"
    meeting.ended_at = _utcnow()
    db.commit()
    db.refresh(meeting)
    return meeting
