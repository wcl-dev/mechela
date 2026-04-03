from fastapi import APIRouter
import httpx
from app.core.settings_store import (
    get_openai_key, set_openai_key, has_llm_mode,
    get_custom_keywords, set_custom_keywords,
    get_internal_keywords, set_internal_keywords,
    get_llm_provider, set_llm_provider, get_provider_config,
    set_provider_config, PROVIDER_DEFAULTS,
)
from app.schemas.settings import (
    ApiKeyUpdate, ApiKeyOut, CustomKeywords, InternalKeywords,
    ProviderConfig, ProviderStatus,
)

router = APIRouter(prefix="/settings", tags=["settings"])


# --- Legacy API key endpoints (kept for backward compat) ---

@router.get("/apikey", response_model=ApiKeyOut)
async def get_api_key_status():
    return ApiKeyOut(
        has_key=has_llm_mode(),
        mode="llm" if has_llm_mode() else "rule-based",
    )


@router.put("/apikey")
async def update_api_key(body: ApiKeyUpdate):
    set_openai_key(body.openai_api_key)
    return {"ok": True, "mode": "llm"}


# --- Provider endpoints ---

@router.get("/provider", response_model=ProviderStatus)
async def get_provider():
    provider = get_llm_provider() or "rule-based"
    config = get_provider_config()
    return ProviderStatus(
        provider=provider,
        mode="llm" if provider != "rule-based" else "rule-based",
    )


@router.put("/provider", response_model=ProviderStatus)
async def update_provider(body: ProviderConfig):
    if body.provider == "rule-based":
        set_llm_provider(None)
    elif body.provider == "openai":
        if body.openai_api_key:
            set_openai_key(body.openai_api_key)
        set_llm_provider("openai")
    elif body.provider == "ollama":
        config = {
            "base_url": body.ollama_base_url,
            "chat_model": body.ollama_chat_model,
            "embed_model": body.ollama_embed_model,
        }
        set_provider_config("ollama", config)
    provider = get_llm_provider() or "rule-based"
    return ProviderStatus(
        provider=provider,
        mode="llm" if provider != "rule-based" else "rule-based",
    )


@router.get("/provider/health", response_model=ProviderStatus)
async def check_provider_health():
    """Check if the active local LLM provider is reachable and list available models."""
    provider = get_llm_provider() or "rule-based"
    if provider == "rule-based":
        return ProviderStatus(provider="rule-based", mode="rule-based")
    if provider == "openai":
        return ProviderStatus(
            provider="openai", mode="llm",
            reachable=bool(get_openai_key()), available_models=["gpt-4o-mini"],
        )

    config = get_provider_config()
    base_url = config.get("base_url", "")
    # Strip /v1 suffix to reach the native API
    server_url = base_url.replace("/v1", "")

    try:
        async with httpx.AsyncClient(timeout=5.0) as http:
            if provider == "ollama":
                resp = await http.get(f"{server_url}/api/tags")
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
            else:
                models = []
        return ProviderStatus(
            provider=provider, mode="llm",
            reachable=True, available_models=models,
        )
    except Exception:
        return ProviderStatus(
            provider=provider, mode="llm",
            reachable=False, available_models=[],
        )


# --- Keywords ---

@router.get("/keywords", response_model=CustomKeywords)
async def get_keywords():
    return CustomKeywords(**get_custom_keywords())


@router.put("/keywords", response_model=CustomKeywords)
async def update_keywords(body: CustomKeywords):
    set_custom_keywords(body.model_dump())
    return body


# --- Internal Keywords (organisation name detection) ---

@router.get("/internal-keywords", response_model=InternalKeywords)
async def get_internal_kw():
    return InternalKeywords(keywords=get_internal_keywords())


@router.put("/internal-keywords", response_model=InternalKeywords)
async def update_internal_kw(body: InternalKeywords):
    set_internal_keywords(body.keywords)
    return body
