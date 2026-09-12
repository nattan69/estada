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
    # Estada es el EMISOR global de tokens del ecosistema Conceptes: firma con
    # RS256 (clave privada local, sin versionar) y publica la clave pública en
    # `/.well-known/jwks.json` para que el resto de apps validen localmente.
    JWT_SECRET: str = 'cambia-este-secreto-en-produccion'  # solo fallback HS256 (sin `cryptography`)
    JWT_ALGORITHM: str = 'RS256'
    JWT_ISSUER: str = 'https://estada.sapedrera.eu'  # `iss` de los tokens emitidos
    JWT_AUDIENCE: str = 'estada'                     # audiencia por defecto (la propia app)
    JWT_ALLOWED_AUDIENCES: List[str] = ['estada', 'compta', 'comanda', 'jornada', 'ariadna']
    JWT_PRIVATE_KEY_PATH: str = 'keys/jwt_private.pem'  # clave privada (auto-generada si falta)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hores (torn de recepció)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    AUDIENCE_TOKEN_EXPIRE_MINUTES: int = 15  # token restringido a otra app (corta duración)

    # Bootstrap: usuari owner inicial (es crea només si la BD està buida).
    BOOTSTRAP_ADMIN_EMAIL: str = 'admin@estada.local'
    BOOTSTRAP_ADMIN_PASSWORD: str = 'cambia-esta-contrasenya'
    BOOTSTRAP_TENANT_NAME: str = 'Estada'
    BOOTSTRAP_TENANT_SLUG: str = 'estada'

    # Compta (hub comptable): emissió de tancaments de foli + night audit.
    COMPTA_URL: str = 'http://localhost:8010'
    COMPTA_KEY_ESTADA: str = ''

    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore'
    )

settings = Settings()
