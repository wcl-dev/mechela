from pydantic import BaseModel


class ApiKeyUpdate(BaseModel):
    openai_api_key: str


class ApiKeyOut(BaseModel):
    has_key: bool
    mode: str  # "llm" or "rule-based"


class CustomKeywords(BaseModel):
    L1: list[str] = []
    L2: list[str] = []
    L3: list[str] = []
