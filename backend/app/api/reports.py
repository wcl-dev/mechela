from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.core.settings_store import get_openai_key, has_llm_mode
from app.models.report import Report, Anchor
from app.models.signal import Signal
from app.schemas.report import ReportOut
from app.schemas.signal import SignalOut
from app.services.parser import parse_docx
from app.services.detector import detect_rule_based, detect_llm, calculate_output_ratio
import shutil

router = APIRouter(prefix="/reports", tags=["reports"])

OUTPUT_WARNING_THRESHOLD = 0.15  # below 15% signal ratio → show warning


@router.post("/upload", response_model=dict)
async def upload_report(
    project_id: int = Form(...),
    name: str = Form(...),
    report_date: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported")

    # Save file
    file_path = settings.upload_dir / f"{project_id}_{file.filename}"
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

    # Detect signals
    api_key = get_openai_key()
    if api_key:
        signals = await detect_llm(parsed, api_key)
    else:
        signals = detect_rule_based(parsed)

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
        "mode": "llm" if api_key else "rule-based",
        "output_warning": show_warning,
        "output_warning_message": (
            "This report is primarily activity-based. Few change signals were detected. "
            "This is normal and not an error."
        ) if show_warning else None,
    }


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
    result = await db.execute(
        select(Signal)
        .join(Anchor)
        .where(Anchor.report_id == report_id)
    )
    return result.scalars().all()
