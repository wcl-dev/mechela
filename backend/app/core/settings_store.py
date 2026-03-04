"""Simple file-based store for user settings (API key, etc.)"""
import json
from pathlib import Path
from app.core.config import BASE_DIR

SETTINGS_FILE = BASE_DIR / "user_settings.json"


def _load() -> dict:
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text())
    return {}


def _save(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data))


def get_openai_key() -> str | None:
    return _load().get("openai_api_key")


def set_openai_key(key: str):
    data = _load()
    data["openai_api_key"] = key
    _save(data)


def has_llm_mode() -> bool:
    return bool(get_openai_key())


def get_custom_keywords() -> dict:
    data = _load()
    return data.get("custom_keywords", {"L1": [], "L2": [], "L3": []})


def set_custom_keywords(keywords: dict):
    data = _load()
    data["custom_keywords"] = keywords
    _save(data)
