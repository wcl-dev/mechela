from pydantic import BaseModel
from app.models.signal import SignalLevel, SignalType, SignalStatus


class SignalOut(BaseModel):
    id: int
    anchor_id: int
    text: str
    subject: str | None
    level: SignalLevel
    signal_type: SignalType | None
    status: SignalStatus
    confidence: float | None
    llm_mode: bool
    matched_user_keywords: dict[str, list[str]] = {"L1": [], "L2": [], "L3": []}

    model_config = {"from_attributes": True}


class SignalReview(BaseModel):
    text: str | None = None
    level: SignalLevel | None = None
    signal_type: SignalType | None = None
    status: SignalStatus | None = None
    thread_id: int | None = None
