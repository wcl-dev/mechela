from pydantic import BaseModel
from app.models.thread import ThreadType


class ThreadCreate(BaseModel):
    objective_id: int
    statement: str
    thread_type: ThreadType | None = None


class ThreadUpdate(BaseModel):
    statement: str | None = None
    thread_type: ThreadType | None = None
    progression_summary: str | None = None


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
