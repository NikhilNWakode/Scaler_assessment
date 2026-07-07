"""FastAPI application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from . import models  # noqa: F401  (register models with Base before create_all)
from .database import Base, engine
from .routers import meetings, users
from .seed import seed
from .ws import router as ws_router


def _init_db() -> None:
    # All data is demo/seed data, so if the schema changed since the DB file
    # was created, rebuild it from scratch instead of migrating.
    inspector = inspect(engine)
    if "meetings" in inspector.get_table_names():
        columns = {c["name"] for c in inspector.get_columns("meetings")}
        if "host_key" not in columns:
            Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()


_init_db()

app = FastAPI(title="Zoom Clone API", version="1.0.0")

# Frontend origins allowed to call this API (local dev + deployed frontend)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(ws_router)


@app.get("/")
def health():
    return {"status": "ok", "service": "Zoom Clone API"}
