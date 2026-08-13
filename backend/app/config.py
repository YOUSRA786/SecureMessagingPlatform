"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv


# Load local development variables when a .env file is present. Environment values
# supplied by the host process still take precedence.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Runtime settings with safe local-development defaults."""

    database_url: str
    cors_origins: list[str]
    debug: bool
    auth_secret_key: str
    dev_otp: str
    access_token_expire_minutes: int


@lru_cache
def get_settings() -> Settings:
    """Create and cache settings once per process."""

    origins = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    )
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./signal_clone.db"),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        debug=os.getenv("DEBUG", "false").lower() in {"1", "true", "yes"},
        auth_secret_key=os.getenv("AUTH_SECRET_KEY", "development-only-secret-change-me"),
        dev_otp=os.getenv("DEV_OTP", "123456"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")),
    )
