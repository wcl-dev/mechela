from fastapi import APIRouter
from app.core.settings_store import (
    get_openai_key, set_openai_key, has_llm_mode,
    get_custom_keywords, set_custom_keywords,
)
from app.schemas.settings import ApiKeyUpdate, ApiKeyOut, CustomKeywords

router = APIRouter(prefix="/settings", tags=["settings"])


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


@router.get("/keywords", response_model=CustomKeywords)
async def get_keywords():
    return CustomKeywords(**get_custom_keywords())


@router.put("/keywords", response_model=CustomKeywords)
async def update_keywords(body: CustomKeywords):
    set_custom_keywords(body.model_dump())
    return body
