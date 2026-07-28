from typing import Optional
from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    llm_provider: str = 'groq'
    llm_model: str = 'deepseek-coder'
    llm_api_key: Optional[str] = None
    sandbox_timeout_seconds: int = 10

    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=False,
        extra='ignore'
    )



settings = Settings()
