"""Seguridad: hashing de contraseñas y emisión/validación de JWT.

Sustituye el auth de mentira (`dummy-token`) por un flujo real:
- bcrypt para las contraseñas (nunca en claro).
- JWT de acceso (corto) + JWT de refresco (largo).
- JWT GLOBAL: Estada actúa como emisor (issuer) para todo el ecosistema
  Conceptes (Compta, Comanda, Jornada, Ariadna...). Firma con RS256
  asimétrico y publica la clave pública en `/.well-known/jwks.json` para que
  el resto de apps validen los tokens localmente (sin secreto compartido).
- Dependencias FastAPI para proteger endpoints por rol.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

import base64
import hashlib
import hmac
import json
import os

try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:  # p. ej. Termux/Android: sin wheels de bcrypt
    _HAS_BCRYPT = False

# Soporte de RS256 (claves asimétricas). En entornos sin `cryptography`
# (p. ej. Termux/Android) se degrada a HS256 (secreto compartido, solo dev).
try:
    from cryptography.hazmat.primitives import serialization as _serialization
    from cryptography.hazmat.primitives.asymmetric import rsa as _rsa
    _HAS_CRYPTO = True
except ImportError:
    _HAS_CRYPTO = False

import jwt
from jwt.algorithms import RSAAlgorithm
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.models import User

# Esquema Bearer para extraer el token del header Authorization.
_bearer = HTTPBearer(auto_error=False)

# Iteraciones para el fallback pbkdf2 (solo cuando bcrypt no está disponible).
_PBKDF2_ITERATIONS = 260_000

# Algoritmo efectivo de firma: RS256 si hay `cryptography`, si no HS256.
_JWT_ALGORITHM = "RS256" if _HAS_CRYPTO else "HS256"


# ------------------------------------------------------------
# Hashing de contraseñas
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    """Retorna un hash de contrasenya: bcrypt si és disponible, si no pbkdf2 (stdlib)."""
    if _HAS_BCRYPT:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2$sha256${_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Comprova una contrasenya contra el seu hash (bcrypt o pbkdf2)."""
    if password_hash.startswith("pbkdf2$"):
        try:
            _, algo, iters, salt_hex, dk_hex = password_hash.split("$")
            dk = hashlib.pbkdf2_hmac(
                algo, password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
            )
            return hmac.compare_digest(dk.hex(), dk_hex)
        except (ValueError, TypeError):
            return False
    if _HAS_BCRYPT:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except (ValueError, TypeError):
            return False
    return False


# ------------------------------------------------------------
# Claves asimétricas (RS256) — emisor de JWT global
# ------------------------------------------------------------
_jwt_private_pem: Optional[bytes] = None
_jwt_public_pem: Optional[bytes] = None
_jwt_kid: Optional[str] = None


def _ensure_keys() -> None:
    """Carga (o genera y persiste) el par de claves RSA para firmar el JWT."""
    global _jwt_private_pem, _jwt_public_pem, _jwt_kid
    if _jwt_private_pem is not None:
        return
    priv_path = settings.JWT_PRIVATE_KEY_PATH
    if os.path.exists(priv_path):
        with open(priv_path, "rb") as f:
            _jwt_private_pem = f.read()
    else:
        key = _rsa.generate_private_key(public_exponent=65537, key_size=2048)
        _jwt_private_pem = key.private_bytes(
            encoding=_serialization.Encoding.PEM,
            format=_serialization.PrivateFormat.PKCS8,
            encryption_algorithm=_serialization.NoEncryption(),
        )
        os.makedirs(os.path.dirname(priv_path) or ".", exist_ok=True)
        with open(priv_path, "wb") as f:
            f.write(_jwt_private_pem)
        os.chmod(priv_path, 0o600)
    # La clave pública se deriva siempre de la privada (sin archivo aparte).
    priv_key = _serialization.load_pem_private_key(_jwt_private_pem, password=None)
    _jwt_public_pem = priv_key.public_key().public_bytes(
        encoding=_serialization.Encoding.PEM,
        format=_serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    _jwt_kid = _compute_kid(_jwt_public_pem)


def _compute_kid(public_pem: bytes) -> str:
    """`kid` estable (thumbprint RFC 7638) derivado de la clave pública."""
    pub = _serialization.load_pem_public_key(public_pem)
    jwk = json.loads(RSAAlgorithm.to_jwk(pub))
    canonical = json.dumps(
        {"e": jwk["e"], "kty": jwk["kty"], "n": jwk["n"]},
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return base64.urlsafe_b64encode(hashlib.sha256(canonical).digest()).rstrip(b"=").decode("ascii")


def get_jwks() -> dict:
    """JWKS público para que las demás apps validen los tokens emitidos."""
    if not _HAS_CRYPTO:
        return {"keys": []}
    _ensure_keys()
    pub = _serialization.load_pem_public_key(_jwt_public_pem)
    jwk = json.loads(RSAAlgorithm.to_jwk(pub))
    jwk.update({"alg": "RS256", "use": "sig", "kid": _jwt_kid})
    return {"keys": [jwk]}


# ------------------------------------------------------------
# JWT
# ------------------------------------------------------------
def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    audience: Optional[str] = None,
    user: Optional[User] = None,
) -> str:
    now = datetime.now(timezone.utc)
    aud = [audience] if audience else [settings.JWT_AUDIENCE]
    payload = {
        "sub": subject,          # id de l'usuari (UUID)
        "type": token_type,      # "access" | "refresh"
        "iss": settings.JWT_ISSUER,
        "aud": aud,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid4()),
    }
    if user is not None:
        payload["tenant_id"] = str(user.tenant_id)
        payload["roles"] = [user.role]
        payload["name"] = user.name
        payload["email"] = user.email
    if _HAS_CRYPTO:
        _ensure_keys()
        return jwt.encode(
            payload, _jwt_private_pem, algorithm="RS256", headers={"kid": _jwt_kid}
        )
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_access_token(
    user: User,
    audience: Optional[str] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    minutes = (
        expires_minutes if expires_minutes is not None
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return _create_token(
        str(user.id),
        "access",
        timedelta(minutes=minutes),
        audience=audience,
        user=user,
    )


def create_refresh_token(user: User) -> str:
    return _create_token(
        str(user.id),
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user=user,
    )


def decode_token(token: str, audience: Optional[str] = None) -> dict:
    """Valida y retorna el payload del JWT. Lanza HTTPException si no es válido."""
    kwargs: dict = {}
    if audience:
        kwargs["audience"] = audience
    if _HAS_CRYPTO:
        _ensure_keys()
        key = _jwt_public_pem
        algorithms = ["RS256"]
    else:
        key = settings.JWT_SECRET
        algorithms = ["HS256"]
    try:
        return jwt.decode(
            token,
            key,
            algorithms=algorithms,
            issuer=settings.JWT_ISSUER,
            **kwargs,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirat")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")


# ------------------------------------------------------------
# Dependencias de autenticación
# ------------------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resuelve el usuario autenticado a partir del JWT de acceso."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticació requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # La audiencia debe incluir la propia de Estada: un token emitido para
    # otra app (p. ej. `compta`) NO autoriza el acceso a la API de Estada.
    payload = decode_token(credentials.credentials, audience=settings.JWT_AUDIENCE)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token d'accés requerit")

    try:
        user_id = UUID(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invàlid")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari no trobat")
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuari desactivat")
    return user


def require_roles(*roles: str):
    """Dependencia que exige uno de los roles indicados."""
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol insuficient (cal {', '.join(roles)})",
            )
        return user

    return _check
