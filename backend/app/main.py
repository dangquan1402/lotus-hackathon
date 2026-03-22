from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import create_tables
from app.routes import assessment, chat, quiz, slides, topics, users, video

OUTPUT_DIR = Path("output")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create DB tables on startup."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(parents=True, exist_ok=True)
    await create_tables()
    yield


app = FastAPI(
    title="Lumina Learning Platform",
    description="Personalized AI-powered learning platform backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(users.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(slides.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(assessment.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# Serve generated files (videos, slides, images)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=str(OUTPUT_DIR)), name="files")


@app.get("/api/health")
async def health_check() -> dict:
    """Basic health check endpoint."""
    return {"status": "ok", "service": "lotus-backend"}
