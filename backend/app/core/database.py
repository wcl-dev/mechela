from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        from app.models import project, report, signal, thread  # noqa
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight migrations: SQLAlchemy's create_all won't add new
        # columns to existing tables, so we ALTER TABLE manually for
        # columns added after initial schema. Use IF NOT EXISTS-style
        # guarded via PRAGMA so it's idempotent on fresh DBs too.
        await _apply_migrations(conn)


async def _apply_migrations(conn):
    """Idempotent column additions for existing databases."""
    from sqlalchemy import text

    async def add_column_if_missing(table: str, column: str, ddl: str):
        res = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in res.fetchall()}
        if column not in existing:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))

    await add_column_if_missing("projects", "custom_keywords", "JSON")
    await add_column_if_missing("projects", "internal_keywords", "JSON")
