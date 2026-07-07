"""FastAPI application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register models with Base before create_all)
from .database import Base, engine
from .routers import meetings, users
from .seed import seed
from .ws import router as ws_router

Base.metadata.create_all(bind=engine)
seed()

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
