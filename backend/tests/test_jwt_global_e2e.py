"""Test e2e del JWT global (RS256 + JWKS + intercambio de audiencia).

Verifica: login emite token RS256 con iss/aud/jti/roles/tenant_id; JWKS sirve
la clave pública; un tercero puede validar el token con la clave pública; el
intercambio /auth/token emite un token con aud=compta que NO autoriza la API
de Estada (aud != estada).
"""
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test_jwt.db")
os.environ["JWT_PRIVATE_KEY_PATH"] = os.path.join(tempfile.mkdtemp(), "jwt_private.pem")

import jwt
from fastapi.testclient import TestClient
from jwt.algorithms import RSAAlgorithm
from cryptography.hazmat.primitives import serialization

from app.main import app
from app.config import settings

import base64
import hashlib
import json

def kid_from_jwks(jwks):
    return jwks["keys"][0]["kid"]

def thumbprint(jwk):
    canonical = json.dumps({"e": jwk["e"], "kty": jwk["kty"], "n": jwk["n"]}, sort_keys=True, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(hashlib.sha256(canonical).digest()).rstrip(b"=").decode()

with TestClient(app) as c:
    # 1) JWKS público
    r = c.get("/.well-known/jwks.json")
    assert r.status_code == 200, r.text
    jwks = r.json()
    assert len(jwks["keys"]) == 1
    jwk = jwks["keys"][0]
    assert jwk["alg"] == "RS256" and jwk["use"] == "sig"
    assert jwk["kid"] == thumbprint(jwk), "kid debe ser el thumbprint RFC 7638"
    print("[1] JWKS OK — kid =", jwk["kid"])

    # 2) discovery
    r = c.get("/.well-known/openid-configuration")
    assert r.status_code == 200, r.text
    disc = r.json()
    assert disc["issuer"] == settings.JWT_ISSUER
    print("[2] discovery OK — issuer =", disc["issuer"])

    # 3) login (bootstrap admin)
    r = c.post("/api/v1/auth/login", json={"email": "admin@estada.local", "password": "cambia-esta-contrasenya"})
    assert r.status_code == 200, r.text
    tok = r.json()
    access = tok["access_token"]
    print("[3] login OK — token_type =", tok["token_type"])

    # 4) decodificar el token como lo haría una app externa (clave pública del JWKS)
    header = jwt.get_unverified_header(access)
    assert header["alg"] == "RS256"
    assert header["kid"] == jwk["kid"]
    pub_key = RSAAlgorithm.from_jwk(jwk)
    payload = jwt.decode(access, pub_key, algorithms=["RS256"], issuer=settings.JWT_ISSUER, audience="estada")
    assert payload["type"] == "access"
    assert payload["iss"] == settings.JWT_ISSUER
    assert payload["aud"] == ["estada"]
    assert payload["roles"] and payload["tenant_id"] and payload["jti"]
    print("[4] validación externa OK — sub =", payload["sub"], "| roles =", payload["roles"], "| aud =", payload["aud"])

    # 5) /me con el token de Estada
    r = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "admin@estada.local"
    print("[5] /me OK")

    # 6) intercambio por audiencia `compta`
    r = c.post("/api/v1/auth/token", json={"audience": "compta"}, headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200, r.text
    ex = r.json()
    assert ex["audience"] == "compta"
    compta_tok = ex["access_token"]
    cp = jwt.decode(compta_tok, pub_key, algorithms=["RS256"], issuer=settings.JWT_ISSUER, audience="compta")
    assert cp["aud"] == ["compta"] and cp["type"] == "access"
    print("[6] token compta OK — expires_in =", ex["expires_in"], "| aud =", cp["aud"])

    # 7) el token `compta` NO debe autorizar la API de Estada
    r = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {compta_tok}"})
    assert r.status_code == 401, f"esperado 401, obtenido {r.status_code}"
    print("[7] token compta rechazado en Estada OK (401)")

    # 8) audiencia no permitida -> 400
    r = c.post("/api/v1/auth/token", json={"audience": "atacant"}, headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 400, r.text
    print("[8] audiencia no permitida -> 400 OK")

print("\n✅ TEST E2E JWT GLOBAL — TOT VERD")
