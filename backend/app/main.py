"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import initialize_database
from app.errors import register_exception_handlers
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.contacts import router as contacts_router
from app.routers.conversations import router as conversations_router
from app.routers.messages import router as messages_router
from app.routers.attachments import router as attachments_router
from app.routers.users import router as users_router
from app.routers.ws import router as ws_router


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize infrastructure before requests are accepted."""

    initialize_database()
    yield


app = FastAPI(
    title="Signal Clone API",
    version="0.1.0",
    description="Backend API for the Signal Clone assignment.",
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(attachments_router)
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Serve uploaded static files
static_path = Path(__file__).resolve().parents[1] / "static"
static_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
app.include_router(ws_router)
