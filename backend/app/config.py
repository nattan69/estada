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

    # Seguridad / autenticación (JWT).
    JWT_SECRET: str = 'cambia-este-secreto-en-produccion'
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hores (torn de recepció)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Bootstrap: usuari owner inicial (es crea només si la BD està buida).
    BOOTSTRAP_ADMIN_EMAIL: str = 'admin@estada.local'
    BOOTSTRAP_ADMIN_PASSWORD: str = 'cambia-esta-contrasenya'
    BOOTSTRAP_TENANT_NAME: str = 'Estada'
    BOOTSTRAP_TENANT_SLUG: str = 'estada'

    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore'
    )

settings = Settings()
