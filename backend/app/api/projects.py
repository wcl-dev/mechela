from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.project import Project, Objective
from app.models.report import Report
from app.schemas.project import ProjectCreate, ProjectOut, ObjectiveCreate, ObjectiveOut
import os

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_project_with_objectives(project_id: int, db: AsyncSession):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.objectives))
        .where(Project.id == project_id)
    )
    return result.scalar_one_or_none()


@router.post("", response_model=ProjectOut)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**body.model_dump())
    db.add(project)
    await db.commit()
    return await _get_project_with_objectives(project.id, db)


@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project).options(selectinload(Project.objectives))
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await _get_project_with_objectives(project_id, db)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.execute(
        select(Project)
        .options(selectinload(Project.reports))
        .where(Project.id == project_id)
    )
    project = project.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    # Delete uploaded files from disk
    for report in project.reports:
        if report.file_path and os.path.exists(report.file_path):
            os.remove(report.file_path)

    await db.delete(project)
    await db.commit()
    return {"ok": True}


@router.post("/{project_id}/objectives", response_model=ObjectiveOut)
async def create_objective(
    project_id: int, body: ObjectiveCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    obj = Objective(project_id=project_id, **body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
