from pydantic import BaseModel, Field


class ObjectiveCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)


class ObjectiveOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None

    model_config = {"from_attributes": True}


class ObjectiveUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None
    objectives: list[ObjectiveOut] = []

    model_config = {"from_attributes": True}
