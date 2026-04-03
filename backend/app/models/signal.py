from sqlalchemy import String, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class SignalLevel(str, enum.Enum):
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    PENDING = "pending"


class SignalType(str, enum.Enum):
    CAPABILITY = "capability"
    INSTITUTIONAL = "institutional"
    RELATIONAL = "relational"


class SignalStatus(str, enum.Enum):
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CONTEXT = "context"


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(primary_key=True)
    anchor_id: Mapped[int] = mapped_column(ForeignKey("anchors.id"))
    text: Mapped[str] = mapped_column(Text)
    subject: Mapped[str | None] = mapped_column(String(255))
    level: Mapped[SignalLevel] = mapped_column(Enum(SignalLevel), default=SignalLevel.PENDING)
    signal_type: Mapped[SignalType | None] = mapped_column(Enum(SignalType))
    status: Mapped[SignalStatus] = mapped_column(Enum(SignalStatus), default=SignalStatus.CANDIDATE)
    confidence: Mapped[float | None] = mapped_column(Float)
    llm_mode: Mapped[bool] = mapped_column(default=False)

    anchor: Mapped["Anchor"] = relationship(back_populates="signals")
    thread_signals: Mapped[list["ThreadSignal"]] = relationship(back_populates="signal")
