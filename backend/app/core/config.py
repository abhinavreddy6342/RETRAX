from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "RETRAX"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    DATABASE_URL: str

    HINDSIGHT_BASE_URL: str = "https://api.hindsight.vectorize.io"
    HINDSIGHT_API_KEY: str = ""
    HINDSIGHT_BANK_ID: str = "retrax-engineering-memory"

    # Local LLM configuration.
    # Hindsight remains the engineering-memory layer;
    # Ollama is the local reasoning / response-generation API.
    LLM_PROVIDER: str = "ollama"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = ""

    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2:latest"
    OLLAMA_TIMEOUT_SECONDS: float = 120.0

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

        local_aliases = {
            "http://localhost:5173": "http://127.0.0.1:5173",
            "http://127.0.0.1:5173": "http://localhost:5173",
        }

        for origin in tuple(origins):
            alias = local_aliases.get(origin)
            if alias and alias not in origins:
                origins.append(alias)

        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()