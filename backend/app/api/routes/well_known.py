"""Endpoints de descubrimiento OIDC (JWKS) para el JWT global.

Permiten que las demás apps del ecosistema (Compta, Comanda, Jornada,
Ariadna...) validen localmente los tokens emitidos por Estada, sin necesidad
de compartir el secreto de firma. Estada es el emisor (issuer) único.
"""
from fastapi import APIRouter

from ...config import settings
from ...services import security

router = APIRouter()


@router.get("/.well-known/jwks.json")
def jwks():
    """Clave pública de firma (RS256) en formato JWKS."""
    return security.get_jwks()


@router.get("/.well-known/openid-configuration")
def openid_configuration():
    """Metadatos de descubrimiento OIDC (issuer + JWKS URI)."""
    return {
        "issuer": settings.JWT_ISSUER,
        "jwks_uri": settings.JWT_ISSUER.rstrip("/") + "/.well-known/jwks.json",
        "token_endpoint": settings.JWT_ISSUER.rstrip("/") + "/api/v1/auth/token",
        "response_types_supported": ["token"],
        "id_token_signing_alg_values_supported": ["RS256"],
    }
