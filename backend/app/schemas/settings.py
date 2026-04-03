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


class InternalKeywords(BaseModel):
    keywords: list[str] = []


class ProviderConfig(BaseModel):
    provider: str  # "openai" | "ollama" | "rule-based"
    openai_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_chat_model: str = "phi4-mini"
    ollama_embed_model: str = "nomic-embed-text"


class ProviderStatus(BaseModel):
    provider: str  # "openai" | "ollama" | "rule-based"
    mode: str  # "llm" or "rule-based"
    reachable: bool | None = None
    available_models: list[str] = []
