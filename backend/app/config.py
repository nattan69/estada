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

    # Claves de integración (Fase 3). Cada integrador usa su propia clave.
    # Comanda (TPV) -> room charges. Unificada: POS_API_KEY (también ESTADA_POS_API_KEY).
    POS_API_KEY: str = ''
    # Ariadna (recepcionista IA) -> toda la API de recepción/reservas/folio.
    ARIADNA_API_KEY: str = ''
    # OTA / Channel Manager -> webhooks de reservas.
    OTA_API_KEY: str = ''

    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore'
    )

settings = Settings()
