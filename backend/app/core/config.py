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