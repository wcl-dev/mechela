from sqlalchemy import String, Text, ForeignKey, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class ThreadType(str, enum.Enum):
    CAPABILITY = "capability"
    INSTITUTIONAL = "institutional"
    RELATIONAL = "relational"


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    objective_id: Mapped[int] = mapped_column(ForeignKey("objectives.id"))
    statement: Mapped[str] = mapped_column(Text)
    thread_type: Mapped[ThreadType | None] = mapped_column(Enum(ThreadType))
    created_at: Mapped[str] = mapped_column(DateTime, default=func.now())

    objective: Mapped["Objective"] = relationship(back_populates="threads")
    thread_signals: Mapped[list["ThreadSignal"]] = relationship(back_populates="thread", cascade="all, delete-orphan")


class ThreadSignal(Base):
    __tablename__ = "thread_signals"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id"))
    signal_id: Mapped[int] = mapped_column(ForeignKey("signals.id"))
    assigned_at: Mapped[str] = mapped_column(DateTime, default=func.now())

    thread: Mapped["Thread"] = relationship(back_populates="thread_signals")
    signal: Mapped["Signal"] = relationship(back_populates="thread_signals")
