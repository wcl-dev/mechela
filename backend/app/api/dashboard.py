from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.project import Project, Objective
from app.models.thread import Thread, ThreadSignal
from app.models.signal import Signal, SignalStatus
from app.models.report import Anchor, Report

router = APIRouter(prefix="/projects", tags=["dashboard"])


@router.get("/{project_id}/dashboard")
async def get_dashboard(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Count all confirmed signals in project
    confirmed_count_result = await db.execute(
        select(func.count(Signal.id))
        .join(Anchor, Signal.anchor_id == Anchor.id)
        .join(Report, Anchor.report_id == Report.id)
        .where(
            Report.project_id == project_id,
            Signal.status == SignalStatus.CONFIRMED,
        )
    )
    total_confirmed = confirmed_count_result.scalar_one()

    result = await db.execute(
        select(Objective).where(Objective.project_id == project_id)
    )
    objectives = result.scalars().all()

    output = []
    for obj in objectives:
        thread_result = await db.execute(
            select(Thread).where(Thread.objective_id == obj.id)
        )
        threads = thread_result.scalars().all()

        thread_data = []
        for thread in threads:
            ts_result = await db.execute(
                select(ThreadSignal).where(ThreadSignal.thread_id == thread.id)
            )
            thread_signals = ts_result.scalars().all()
            signal_ids = [ts.signal_id for ts in thread_signals]

            signals = []
            if signal_ids:
                sig_result = await db.execute(
                    select(Signal, Anchor, Report)
                    .join(Anchor, Signal.anchor_id == Anchor.id)
                    .join(Report, Anchor.report_id == Report.id)
                    .where(Signal.id.in_(signal_ids))
                    .order_by(Report.report_date)
                )
                for sig, anchor, report in sig_result.all():
                    signals.append({
                        "signal_id": sig.id,
                        "text": sig.text,
                        "level": sig.level,
                        "signal_type": sig.signal_type,
                        "report_name": report.name,
                        "report_date": report.report_date,
                        "paragraph_index": anchor.paragraph_index,
                        "confidence": sig.confidence,
                    })

            thread_data.append({
                "thread_id": thread.id,
                "statement": thread.statement,
                "thread_type": thread.thread_type,
                "progression_summary": thread.progression_summary,
                "signal_count": len(signals),
                "signals": signals,
            })

        output.append({
            "objective_id": obj.id,
            "objective_title": obj.title,
            "threads": thread_data,
        })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_confirmed_signals": total_confirmed,
        "objectives": output,
    }


@router.get("/{project_id}/search")
async def search(project_id: int, q: str, db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        raise HTTPException(400, "Query too short")

    result = await db.execute(
        select(Signal, Anchor, Report)
        .join(Anchor, Signal.anchor_id == Anchor.id)
        .join(Report, Anchor.report_id == Report.id)
        .where(
            Report.project_id == project_id,
            Signal.text.ilike(f"%{q}%"),
            Signal.status != SignalStatus.REJECTED,
        )
        .limit(50)
    )

    return [
        {
            "signal_id": sig.id,
            "text": sig.text,
            "level": sig.level,
            "report_name": report.name,
            "report_date": report.report_date,
            "paragraph_index": anchor.paragraph_index,
        }
        for sig, anchor, report in result.all()
    ]


@router.get("/{project_id}/export")
async def export_markdown(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    dashboard = await get_dashboard(project_id, db)
    lines = [f"# {project.name}\n"]

    for obj in dashboard["objectives"]:
        lines.append(f"## Objective: {obj['objective_title']}\n")
        for thread in obj["threads"]:
            lines.append(f"### Thread: {thread['statement']}\n")
            if thread.get("progression_summary"):
                lines.append(f"*{thread['progression_summary']}*\n")
            for sig in thread["signals"]:
                level = sig["level"].value if hasattr(sig["level"], "value") else sig["level"]
                text = sig["text"]
                lines.append(
                    f"- **[{level}]** {text}\n"
                    f"  > *{sig['report_name']} ({sig['report_date']}) \u2014 paragraph {sig['paragraph_index']}*\n"
                )
            lines.append("")

    return {"markdown": "\n".join(lines)}
