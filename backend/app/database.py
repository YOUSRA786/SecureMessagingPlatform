"""SQLAlchemy engine, session lifecycle, and schema initialization."""

from collections.abc import Generator

from sqlalchemy import MetaData, create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


settings = get_settings()

# SQLite requires this flag because FastAPI may serve a request from another thread.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class and migration metadata for all persistence models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _) -> None:
        """SQLite does not enforce foreign keys until this pragma is enabled."""

        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session and always close it."""

    database_session = SessionLocal()
    try:
        yield database_session
    finally:
        database_session.close()


def initialize_database() -> None:
    """Create registered tables if they do not exist yet."""

    # Importing the package registers every model with Base.metadata. Alembic can
    # target this same metadata object when migrations are introduced.
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _apply_development_compatibility_migrations()


def _apply_development_compatibility_migrations() -> None:
    """Bring the Phase 1 local SQLite schema forward without dropping data.

    Production deployments should use Alembic migrations. This small additive
    migration keeps databases created before the phone field was introduced
    usable during assignment development.
    """

    if not settings.database_url.startswith("sqlite"):
        return

    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    if "phone" not in user_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(30)"))
            connection.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users (phone)")
            )
