from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # LLM Provider: "ollama", "openai", or "anthropic"
    llm_provider: str = "ollama"

    # Ollama settings
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5-coder:7b"

    # OpenAI settings
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    # Anthropic settings
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-sonnet-4-20250514"

    # MiniMax settings (free alternative)
    minimax_api_key: Optional[str] = None
    minimax_model: str = "MiniMax-M2.5"

    # OpenRouter settings (free tier for Claude/GPT) - uses same key as MINIMAX_API_KEY if it's an OpenRouter key
    openrouter_model: str = "anthropic/claude-3.5-sonnet"

    # TinyFish settings (for GitHub profile scraping)
    tinyfish_api_key: Optional[str] = None

    # GitHub evaluation settings
    default_max_repos: int = 10
    evaluation_fast_mode: bool = True  # Skip git clone, use GitHub API only

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Database settings
    database_url: str = "postgresql://postgres:postgres@localhost:5432/recruitment"
    redis_url: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()