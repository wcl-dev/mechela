from pydantic import BaseModel


class ReportOut(BaseModel):
    id: int
    project_id: int
    name: str
    report_date: str
    file_path: str

    model_config = {"from_attributes": True}


class AnchorOut(BaseModel):
    id: int
    report_id: int
    paragraph_index: int
    section: str | None
    text: str
    context_text: str | None

    model_config = {"from_attributes": True}
