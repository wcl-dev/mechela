from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.services.llm_client import get_llm_client
from app.models.signal import Signal, SignalLevel, SignalStatus
from app.models.report import Anchor, Report
from app.models.project import Objective
from app.models.thread import Thread, ThreadSignal
from app.schemas.signal import SignalOut, SignalReview
from app.services.matcher import match_rule_based, match_llm
from app.services.detector import compute_matched_user_keywords
from pydantic import BaseModel

router = APIRouter(prefix="/signals", tags=["signals"])


class SignalCreate(BaseModel):
    anchor_id: int
    text: str | None = None  # defaults to anchor.text


@router.post("", response_model=SignalOut)
async def create_signal(body: SignalCreate, db: AsyncSession = Depends(get_db)):
    """Manually create a signal from an existing anchor (for 'Mark as signal' in Review)."""
    anchor = await db.get(Anchor, body.anchor_id)
    if not anchor:
        raise HTTPException(404, "Anchor not found")

    # Check if a signal already exists for this anchor
    existing = await db.execute(select(Signal).where(Signal.anchor_id == body.anchor_id))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Signal already exists for this anchor")

    signal = Signal(
        anchor_id=body.anchor_id,
        text=body.text or anchor.text,
        level=SignalLevel.PENDING,
        status=SignalStatus.PENDING,
        llm_mode=False,
    )
    db.add(signal)
    await db.commit()
    await db.refresh(signal)
    out = SignalOut.model_validate(signal)
    out.matched_user_keywords = compute_matched_user_keywords(signal.text)
    return out


@router.patch("/{signal_id}", response_model=SignalOut)
async def review_signal(
    signal_id: int, body: SignalReview, db: AsyncSession = Depends(get_db)
):
    signal = await db.get(Signal, signal_id)
    if not signal:
        raise HTTPException(404, "Signal not found")

    if body.text is not None:
        signal.text = body.text
    if body.level is not None:
        signal.level = body.level
    if body.signal_type is not None:
        signal.signal_type = body.signal_type
    if body.status is not None:
        signal.status = body.status

    if body.thread_id is not None:
        thread = await db.get(Thread, body.thread_id)
        if not thread:
            raise HTTPException(404, "Thread not found")
        existing = await db.execute(
            select(ThreadSignal).where(
                ThreadSignal.thread_id == body.thread_id,
                ThreadSignal.signal_id == signal_id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(ThreadSignal(thread_id=body.thread_id, signal_id=signal_id))

    await db.commit()
    await db.refresh(signal)
    out = SignalOut.model_validate(signal)
    out.matched_user_keywords = compute_matched_user_keywords(signal.text)
    return out


@router.get("/{signal_id}/thread-suggestions")
async def suggest_threads(
    signal_id: int,
    objective_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Rank threads by similarity to the signal text.
    If objective_id is given, restrict to threads under that objective.
    Otherwise, search all threads in the signal's project."""
    signal = await db.get(Signal, signal_id)
    if not signal:
        raise HTTPException(404, "Signal not found")

    if objective_id is not None:
        result = await db.execute(
            select(Thread).where(Thread.objective_id == objective_id)
        )
    else:
        # Resolve project from signal → anchor → report → project, then
        # fetch all threads across all of that project's objectives.
        anchor = await db.get(Anchor, signal.anchor_id)
        if not anchor:
            raise HTTPException(404, "Signal's anchor not found")
        report = await db.get(Report, anchor.report_id)
        if not report:
            raise HTTPException(404, "Signal's report not found")
        result = await db.execute(
            select(Thread)
            .join(Objective, Thread.objective_id == Objective.id)
            .where(Objective.project_id == report.project_id)
        )
    threads = [{"id": t.id, "statement": t.statement} for t in result.scalars().all()]

    llm = get_llm_client()
    if llm:
        client, chat_model, embed_model = llm
        candidates = await match_llm(signal.text, threads, client, embed_model)
    else:
        candidates = match_rule_based(signal.text, threads)

    return [{"thread_id": c.thread_id, "statement": c.statement, "score": c.score}
            for c in candidates]
