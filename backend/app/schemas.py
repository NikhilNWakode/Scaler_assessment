"""Pydantic request/response schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_color: str


class ScheduleMeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=40, ge=5, le=1440)


class InstantMeetingIn(BaseModel):
    title: str | None = None


class JoinMeetingIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    is_host: bool
    is_muted: bool
    joined_at: datetime
    left_at: datetime | None


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    title: str
    description: str | None
    passcode: str
    meeting_type: str
    status: str
    scheduled_at: datetime | None
    duration_minutes: int
    created_at: datetime
    started_at: datetime | None
    ended_at: datetime | None
    host: UserOut


class MeetingHostOut(MeetingOut):
    """Meeting as seen by its host — includes the secret host key."""

    host_key: str


class MeetingWithParticipants(MeetingOut):
    participants: list[ParticipantOut]


class HostKeyIn(BaseModel):
    host_key: str


class JoinMeetingOut(BaseModel):
    meeting: MeetingOut
    participant: ParticipantOut
