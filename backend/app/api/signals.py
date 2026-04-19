from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.services.llm_client import get_llm_client
from app.models.signal import Signal
from app.models.thread import Thread, ThreadSignal
from app.schemas.signal import SignalOut, SignalReview
from app.services.matcher import match_rule_based, match_llm
from app.services.detector import compute_matched_user_keywords

router = APIRouter(prefix="/signals", tags=["signals"])


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
    objective_id: int,
    db: AsyncSession = Depends(get_db),
):
    signal = await db.get(Signal, signal_id)
    if not signal:
        raise HTTPException(404, "Signal not found")

    result = await db.execute(
        select(Thread).where(Thread.objective_id == objective_id)
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
