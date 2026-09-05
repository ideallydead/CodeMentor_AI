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

    # Per-Agent Specialized Model & Provider Overrides (Optional)
    assessment_agent_provider: Optional[str] = None
    assessment_agent_model: Optional[str] = None

    mentor_agent_provider: Optional[str] = None
    mentor_agent_model: Optional[str] = None

    optimization_agent_provider: Optional[str] = None
    optimization_agent_model: Optional[str] = None

    viva_agent_provider: Optional[str] = None
    viva_agent_model: Optional[str] = None

    integrity_agent_provider: Optional[str] = None
    integrity_agent_model: Optional[str] = None

    testcase_agent_provider: Optional[str] = None
    testcase_agent_model: Optional[str] = None

    faculty_agent_provider: Optional[str] = None
    faculty_agent_model: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file='.env',
        case_sensitive=False,
        extra='ignore'
    )



settings = Settings()

