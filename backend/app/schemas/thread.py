from pydantic import BaseModel, Field
from app.models.thread import ThreadType


class ThreadCreate(BaseModel):
    objective_id: int
    statement: str = Field(..., min_length=1, max_length=500)
    thread_type: ThreadType | None = None


class ThreadUpdate(BaseModel):
    statement: str | None = Field(None, min_length=1, max_length=500)
    thread_type: ThreadType | None = None
    progression_summary: str | None = Field(None, max_length=10000)


class ThreadOut(BaseModel):
    id: int
    objective_id: int
    statement: str
    thread_type: ThreadType | None
    progression_summary: str | None = None
    signal_count: int = 0

    model_config = {"from_attributes": True}


class ThreadMerge(BaseModel):
    source_thread_id: int
    target_thread_id: int


class ThreadReassign(BaseModel):
    target_thread_id: int
