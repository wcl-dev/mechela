from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255))
    report_date: Mapped[str] = mapped_column(String(20))
    file_path: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[str] = mapped_column(DateTime, default=func.now())

    project: Mapped["Project"] = relationship(back_populates="reports")
    anchors: Mapped[list["Anchor"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class Anchor(Base):
    __tablename__ = "anchors"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id"))
    paragraph_index: Mapped[int]
    section: Mapped[str | None] = mapped_column(String(100))
    text: Mapped[str] = mapped_column(Text)
    context_text: Mapped[str | None] = mapped_column(Text)

    report: Mapped["Report"] = relationship(back_populates="anchors")
    signals: Mapped[list["Signal"]] = relationship(back_populates="anchor", cascade="all, delete-orphan")
