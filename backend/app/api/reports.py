from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.services.llm_client import get_llm_client
from app.models.project import Project
from app.models.report import Report, Anchor
from app.models.signal import Signal
from app.models.thread import ThreadSignal
from app.schemas.report import ReportOut
from app.schemas.signal import SignalOut
from app.services.parser import parse_docx
from app.services.detector import detect_rule_based, detect_llm, calculate_output_ratio, compute_matched_user_keywords
from pathlib import Path
import shutil

router = APIRouter(prefix="/reports", tags=["reports"])

OUTPUT_WARNING_THRESHOLD = 0.15  # below 15% signal ratio → show warning


@router.post("/upload", response_model=dict)
async def upload_report(
    project_id: int = Form(...),
    name: str = Form(..., min_length=1, max_length=255),
    report_date: str = Form(..., min_length=1, max_length=64),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    # Strip any path components a malicious client might have embedded in
    # filename (e.g. "../../evil.docx") — we only want the base filename.
    safe_filename = Path(file.filename).name
    if not safe_filename or not safe_filename.endswith(".docx"):
        raise HTTPException(400, "Invalid filename")

    # Save file
    file_path = settings.upload_dir / f"{project_id}_{safe_filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create report record
    report = Report(
        project_id=project_id,
        name=name,
        report_date=report_date,
        file_path=str(file_path),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Parse anchors
    parsed = parse_docx(file_path)
    anchor_objects = []
    for p in parsed:
        anchor = Anchor(
            report_id=report.id,
            paragraph_index=p.paragraph_index,
            section=p.section,
            text=p.text,
            context_text=p.context_text,
        )
        db.add(anchor)
        anchor_objects.append((anchor, p))
    await db.commit()

    # Look up project's own keyword overrides (additive on top of globals)
    project = await db.get(Project, project_id)
    proj_kw = project.custom_keywords if project else None
    proj_internal = project.internal_keywords if project else None

    # Detect signals (with fallback to rule-based if LLM server unreachable)
    llm = get_llm_client()
    fallback_reason = None
    if llm:
        client, chat_model, embed_model = llm
        try:
            signals = await detect_llm(parsed, client, chat_model)
        except Exception:
            signals = detect_rule_based(parsed, proj_kw, proj_internal)
            fallback_reason = "LLM server unreachable — fell back to rule-based detection."
            llm = None  # mark as rule-based for mode reporting
    else:
        signals = detect_rule_based(parsed, proj_kw, proj_internal)

    # Reload anchors to get IDs
    result = await db.execute(
        select(Anchor).where(Anchor.report_id == report.id)
    )
    anchors_db = {a.paragraph_index: a for a in result.scalars().all()}

    signal_count = 0
    for s in signals:
        anchor = anchors_db.get(s.anchor_index)
        if not anchor:
            continue
        signal = Signal(
            anchor_id=anchor.id,
            text=s.text,
            subject=s.subject,
            level=s.level,
            signal_type=s.signal_type,
            status=s.status,
            confidence=s.confidence,
            llm_mode=s.llm_mode,
        )
        db.add(signal)
        signal_count += 1
    await db.commit()

    ratio = calculate_output_ratio(len(parsed), signal_count)
    show_warning = ratio < OUTPUT_WARNING_THRESHOLD

    return {
        "report_id": report.id,
        "total_paragraphs": len(parsed),
        "signals_detected": signal_count,
        "mode": "llm" if llm else "rule-based",
        "output_warning": show_warning,
        "output_warning_message": (
            "This report is primarily activity-based. Few change signals were detected. "
            "This is normal and not an error."
        ) if show_warning else None,
        "fallback_reason": fallback_reason,
    }


@router.post("/{report_id}/redetect", response_model=dict)
async def redetect_signals(report_id: int, db: AsyncSession = Depends(get_db)):
    """Re-run signal detection on an existing report using the current mode."""
    from sqlalchemy import delete

    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    # Load anchors
    result = await db.execute(
        select(Anchor).where(Anchor.report_id == report.id)
    )
    anchors_db = {a.paragraph_index: a for a in result.scalars().all()}
    if not anchors_db:
        raise HTTPException(400, "Report has no parsed anchors")

    # Count existing confirmed signals for warning (snapshot before delete)
    existing = await db.execute(
        select(Signal).join(Anchor).where(Anchor.report_id == report.id)
    )
    old_signals = existing.scalars().all()
    old_signal_ids = [s.id for s in old_signals]
    confirmed_count = sum(1 for s in old_signals if s.status.value == "confirmed")

    # Bulk-delete thread links and signals in one transaction, then commit
    # *before* kicking off the slow LLM call — avoids holding the SQLite
    # write lock for minutes while Ollama runs.
    if old_signal_ids:
        await db.execute(
            delete(ThreadSignal).where(ThreadSignal.signal_id.in_(old_signal_ids))
        )
        await db.execute(
            delete(Signal).where(Signal.id.in_(old_signal_ids))
        )
    await db.commit()

    # Re-parse the DOCX to get ParsedAnchor objects for the detector
    parsed = parse_docx(Path(report.file_path))

    # Look up project keyword overrides for the detector
    project = await db.get(Project, report.project_id)
    proj_kw = project.custom_keywords if project else None
    proj_internal = project.internal_keywords if project else None

    # Re-detect
    llm = get_llm_client()
    fallback_reason = None
    if llm:
        client, chat_model, embed_model = llm
        try:
            signals = await detect_llm(parsed, client, chat_model)
        except Exception:
            signals = detect_rule_based(parsed, proj_kw, proj_internal)
            fallback_reason = "LLM server unreachable — fell back to rule-based detection."
            llm = None
    else:
        signals = detect_rule_based(parsed, proj_kw, proj_internal)

    # Save new signals
    signal_count = 0
    for s in signals:
        anchor = anchors_db.get(s.anchor_index)
        if not anchor:
            continue
        signal = Signal(
            anchor_id=anchor.id,
            text=s.text,
            subject=s.subject,
            level=s.level,
            signal_type=s.signal_type,
            status=s.status,
            confidence=s.confidence,
            llm_mode=s.llm_mode,
        )
        db.add(signal)
        signal_count += 1
    await db.commit()

    ratio = calculate_output_ratio(len(parsed), signal_count)
    show_warning = ratio < OUTPUT_WARNING_THRESHOLD

    return {
        "report_id": report.id,
        "total_paragraphs": len(parsed),
        "signals_detected": signal_count,
        "previous_confirmed_replaced": confirmed_count,
        "mode": "llm" if llm else "rule-based",
        "output_warning": show_warning,
        "output_warning_message": (
            "This report is primarily activity-based. Few change signals were detected. "
            "This is normal and not an error."
        ) if show_warning else None,
        "fallback_reason": fallback_reason,
    }


@router.delete("/{report_id}")
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    # Delete thread_signal links for all signals in this report
    anchors_result = await db.execute(
        select(Anchor).where(Anchor.report_id == report.id)
    )
    for anchor in anchors_result.scalars().all():
        signals_result = await db.execute(
            select(Signal).where(Signal.anchor_id == anchor.id)
        )
        for sig in signals_result.scalars().all():
            ts_result = await db.execute(
                select(ThreadSignal).where(ThreadSignal.signal_id == sig.id)
            )
            for ts in ts_result.scalars().all():
                await db.delete(ts)

    # Delete the report (cascades to anchors → signals)
    await db.delete(report)
    await db.commit()

    # Delete uploaded file from disk
    fp = Path(report.file_path) if report.file_path else None
    if fp and fp.exists():
        fp.unlink()

    return {"ok": True}


@router.get("/project/{project_id}", response_model=list[ReportOut])
async def list_reports(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report)
        .where(Report.project_id == project_id)
        .order_by(Report.report_date)
    )
    return result.scalars().all()


@router.get("/{report_id}/signals", response_model=list[SignalOut])
async def get_signals(report_id: int, db: AsyncSession = Depends(get_db)):
    # Resolve project for per-project keyword overrides
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    project = await db.get(Project, report.project_id)
    proj_kw = project.custom_keywords if project else None

    result = await db.execute(
        select(Signal)
        .join(Anchor)
        .where(Anchor.report_id == report_id)
    )
    signals = result.scalars().all()
    out = []
    for s in signals:
        sig = SignalOut.model_validate(s)
        sig.matched_user_keywords = compute_matched_user_keywords(s.text, proj_kw)
        out.append(sig)
    return out


@router.get("/{report_id}/anchors")
async def get_anchors(report_id: int, db: AsyncSession = Depends(get_db)):
    """Return all anchors (parsed paragraphs) for a report, with signal assignments."""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    anchor_result = await db.execute(
        select(Anchor)
        .where(Anchor.report_id == report_id)
        .order_by(Anchor.paragraph_index)
    )
    anchors = anchor_result.scalars().all()

    signal_result = await db.execute(
        select(Signal).join(Anchor).where(Anchor.report_id == report_id)
    )
    signals_by_anchor = {s.anchor_id: s.id for s in signal_result.scalars().all()}

    return {
        "report_id": report_id,
        "report_name": report.name,
        "report_date": report.report_date,
        "anchors": [
            {
                "id": a.id,
                "paragraph_index": a.paragraph_index,
                "section": a.section,
                "text": a.text,
                "context_text": a.context_text,
                "signal_id": signals_by_anchor.get(a.id),
            }
            for a in anchors
        ],
    }

