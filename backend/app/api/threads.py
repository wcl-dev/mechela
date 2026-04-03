from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.thread import Thread, ThreadSignal
from app.models.signal import Signal
from app.schemas.thread import ThreadCreate, ThreadUpdate, ThreadOut, ThreadMerge, ThreadReassign

router = APIRouter(prefix="/threads", tags=["threads"])


async def _signal_count(thread_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).where(ThreadSignal.thread_id == thread_id)
    )
    return result.scalar_one()


@router.post("", response_model=ThreadOut)
async def create_thread(body: ThreadCreate, db: AsyncSession = Depends(get_db)):
    thread = Thread(**body.model_dump())
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    count = await _signal_count(thread.id, db)
    return ThreadOut(**thread.__dict__, signal_count=count)


@router.get("/objective/{objective_id}", response_model=list[ThreadOut])
async def list_threads(objective_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Thread).where(Thread.objective_id == objective_id)
    )
    threads = result.scalars().all()
    out = []
    for t in threads:
        count = await _signal_count(t.id, db)
        out.append(ThreadOut(**t.__dict__, signal_count=count))
    return out


@router.patch("/{thread_id}", response_model=ThreadOut)
async def update_thread(
    thread_id: int, body: ThreadUpdate, db: AsyncSession = Depends(get_db)
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(thread, k, v)
    await db.commit()
    await db.refresh(thread)
    count = await _signal_count(thread.id, db)
    return ThreadOut(**thread.__dict__, signal_count=count)


@router.post("/merge", response_model=ThreadOut)
async def merge_threads(body: ThreadMerge, db: AsyncSession = Depends(get_db)):
    source = await db.get(Thread, body.source_thread_id)
    target = await db.get(Thread, body.target_thread_id)
    if not source or not target:
        raise HTTPException(404, "Thread not found")

    # Move all signals from source to target
    result = await db.execute(
        select(ThreadSignal).where(ThreadSignal.thread_id == body.source_thread_id)
    )
    for ts in result.scalars().all():
        existing = await db.execute(
            select(ThreadSignal).where(
                ThreadSignal.thread_id == body.target_thread_id,
                ThreadSignal.signal_id == ts.signal_id,
            )
        )
        if not existing.scalar_one_or_none():
            ts.thread_id = body.target_thread_id
        else:
            await db.delete(ts)

    await db.delete(source)
    await db.commit()
    await db.refresh(target)
    count = await _signal_count(target.id, db)
    return ThreadOut(**target.__dict__, signal_count=count)


@router.delete("/{thread_id}")
async def delete_thread(
    thread_id: int, body: ThreadReassign, db: AsyncSession = Depends(get_db)
):
    thread = await db.get(Thread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")

    # Check not the last thread in objective
    result = await db.execute(
        select(func.count()).where(Thread.objective_id == thread.objective_id)
    )
    if result.scalar_one() <= 1:
        raise HTTPException(400, "Cannot delete the last thread in an objective")

    target = await db.get(Thread, body.target_thread_id)
    if not target:
        raise HTTPException(404, "Target thread not found")

    # Reassign signals
    result = await db.execute(
        select(ThreadSignal).where(ThreadSignal.thread_id == thread_id)
    )
    for ts in result.scalars().all():
        ts.thread_id = body.target_thread_id

    await db.delete(thread)
    await db.commit()
    return {"ok": True}
