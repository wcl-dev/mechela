from sqlalchemy import String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime, default=func.now())
    # Per-project keyword overrides. Merged additively with the global
    # lists in user_settings.json during detection/annotation.
    # Shape: {"L1": [...], "L2": [...], "L3": [...]}
    custom_keywords: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Per-project ignore keywords (organisation names etc)
    internal_keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)

    objectives: Mapped[list["Objective"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Objective(Base):
    __tablename__ = "objectives"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)

    project: Mapped["Project"] = relationship(back_populates="objectives")
    threads: Mapped[list["Thread"]] = relationship(back_populates="objective", cascade="all, delete-orphan")
