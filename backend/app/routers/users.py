"""Default-user endpoint. The assignment assumes a user is already logged in."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

DEFAULT_USER = {
    "name": "Nikhil Wakode",
    "email": "wakode333nikhil@gmail.com",
    "avatar_color": "#0E72ED",
}


def get_default_user(db: Session) -> models.User:
    """Fetch (or lazily create) the default logged-in user."""
    user = db.scalar(select(models.User).where(models.User.email == DEFAULT_USER["email"]))
    if not user:
        user = models.User(**DEFAULT_USER)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserOut)
def me(db: Session = Depends(get_db)):
    return get_default_user(db)
