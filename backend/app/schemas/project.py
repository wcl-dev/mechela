from pydantic import BaseModel


class ObjectiveCreate(BaseModel):
    title: str
    description: str | None = None


class ObjectiveOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None

    model_config = {"from_attributes": True}


class ObjectiveUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None
    objectives: list[ObjectiveOut] = []

    model_config = {"from_attributes": True}
