"""Simple file-based store for user settings (API key, provider config, etc.)"""
import json
from pathlib import Path
from app.core.config import BASE_DIR

SETTINGS_FILE = BASE_DIR / "user_settings.json"

VALID_PROVIDERS = {"openai", "ollama"}

# Default configuration per provider
PROVIDER_DEFAULTS = {
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "chat_model": "phi4-mini",
        "embed_model": "nomic-embed-text",
    },
    "openai": {
        "chat_model": "gpt-4o-mini",
        "embed_model": "text-embedding-3-small",
    },
}


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
    # Auto-set provider to openai when key is saved
    if not data.get("llm_provider"):
        data["llm_provider"] = "openai"
    _save(data)


def get_llm_provider() -> str | None:
    """Return active provider name or None for rule-based mode.

    Backward-compatible: if no llm_provider is set but openai_api_key exists,
    returns "openai".
    """
    data = _load()
    provider = data.get("llm_provider")
    if provider in VALID_PROVIDERS:
        # For openai, also check that key exists
        if provider == "openai" and not data.get("openai_api_key"):
            return None
        return provider
    # Backward compat: old settings with only openai_api_key
    if data.get("openai_api_key"):
        return "openai"
    return None


def set_llm_provider(provider: str | None):
    """Set active provider. Pass None to switch to rule-based mode."""
    data = _load()
    if provider is None:
        data.pop("llm_provider", None)
    elif provider in VALID_PROVIDERS:
        data["llm_provider"] = provider
    else:
        raise ValueError(f"Invalid provider: {provider}. Must be one of {VALID_PROVIDERS}")
    _save(data)


def get_provider_config() -> dict:
    """Return full provider config dict with base_url, chat_model, embed_model, api_key."""
    data = _load()
    provider = get_llm_provider()
    if provider is None:
        return {}
    defaults = PROVIDER_DEFAULTS[provider]
    if provider == "openai":
        return {
            "api_key": data.get("openai_api_key"),
            "chat_model": defaults["chat_model"],
            "embed_model": defaults["embed_model"],
        }
    return {
        "base_url": data.get("ollama_base_url", defaults["base_url"]),
        "chat_model": data.get("ollama_chat_model", defaults["chat_model"]),
        "embed_model": data.get("ollama_embed_model", defaults["embed_model"]),
    }


def set_provider_config(provider: str, config: dict):
    """Save provider-specific config (base_url, chat_model, embed_model)."""
    data = _load()
    data["llm_provider"] = provider
    if provider == "openai" and "api_key" in config:
        data["openai_api_key"] = config["api_key"]
    elif provider == "ollama":
        for key in ("base_url", "chat_model", "embed_model"):
            if key in config:
                data[f"ollama_{key}"] = config[key]
    _save(data)


def has_llm_mode() -> bool:
    return get_llm_provider() is not None


def get_custom_keywords() -> dict:
    data = _load()
    return data.get("custom_keywords", {"L1": [], "L2": [], "L3": []})


def set_custom_keywords(keywords: dict):
    data = _load()
    data["custom_keywords"] = keywords
    _save(data)


def get_internal_keywords() -> list[str]:
    data = _load()
    return data.get("internal_keywords", [])


def set_internal_keywords(keywords: list[str]):
    data = _load()
    data["internal_keywords"] = keywords
    _save(data)
