"""Factory for creating LLM clients based on the active provider setting."""
from openai import AsyncOpenAI
from app.core.settings_store import get_llm_provider, get_provider_config


# Local models need more time (CPU inference can be slow)
_TIMEOUTS = {
    "openai": 30.0,
    "ollama": 120.0,
}


def get_llm_client() -> tuple[AsyncOpenAI, str, str] | None:
    """Return (client, chat_model, embed_model) or None for rule-based mode."""
    provider = get_llm_provider()
    if provider is None:
        return None

    config = get_provider_config()
    timeout = _TIMEOUTS.get(provider, 60.0)

    if provider == "openai":
        client = AsyncOpenAI(api_key=config["api_key"], timeout=timeout)
        return client, config["chat_model"], config["embed_model"]

    # Ollama: OpenAI-compatible API with dummy api_key
    client = AsyncOpenAI(
        base_url=config["base_url"],
        api_key=provider,  # Required by SDK, ignored by local servers
        timeout=timeout,
    )
    return client, config["chat_model"], config["embed_model"]
