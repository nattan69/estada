from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """
    Configuración de la aplicación Estada PMS.
    """
    DATABASE_URL: str = 'sqlite:///./estada.db'
    VERIFACTU_SOFTWARE_NAME: str = 'Estada PMS'
    VERIFACTU_SOFTWARE_VERSION: str = '0.1.0'
    CORS_ORIGINS: List[str] = ['*']

    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore'
    )

settings = Settings()
