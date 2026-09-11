# AUTH GLOBAL — JWT con Estada como emisor

> **Estada es el emisor (issuer) único de tokens del ecosistema Conceptes.**
> El resto de apps (Compta, Comanda, Jornada, Ariadna…) validan los tokens de
> Estada **localmente** contra su clave pública, sin secreto compartido.

## Algoritmo y claves

- Firma **RS256** (asimétrica). Estada guarda la clave **privada** en local
  (`backend/keys/jwt_private.pem`, sin versionar — auto-generada en el primer
  arranque si no existe).
- La clave **pública** se publica en formato JWKS. Cada app la obtiene de
  Estada y la cachea (rotación por `kid`).

## Endpoints de descubrimiento

| Endpoint | Descripción |
|---|---|
| `GET /.well-known/jwks.json` | Clave pública de firma (JWKS, `RS256` + `kid`) |
| `GET /.well-known/openid-configuration` | Metadatos OIDC (`issuer`, `jwks_uri`, `token_endpoint`) |
| `POST /api/v1/auth/login` | Login → access + refresh token (audiencia por defecto `estada`) |
| `POST /api/v1/auth/token` | Intercambio de token por otro restringido a una audiencia |

## Claims del access token

| Claim | Tipo | Descripción |
|---|---|---|
| `iss` | str | Emisor: `https://estada.sapedrera.eu` (configurable `JWT_ISSUER`) |
| `sub` | str (UUID) | ID global del usuario |
| `aud` | list[str] | Audiencia(s) destino. El token de Estada lleva `["estada"]` |
| `type` | str | `access` o `refresh` |
| `iat` / `exp` | int | Emisión / expiración (epoch) |
| `jti` | str (UUID) | ID único del token (revocación) |
| `tenant_id` | str (UUID) | Tenant global del usuario |
| `roles` | list[str] | Roles del usuario (RBAC) |
| `name` / `email` | str | Identidad del usuario |

## Cómo obtiene una app su token (flujo)

1. El usuario inicia sesión en Estada (`POST /api/v1/auth/login`) y recibe un
   token con `aud=["estada"]`.
2. Para operar contra otra app (p. ej. Compta), el frontend llama a
   `POST /api/v1/auth/token` con `{"audience": "compta"}` **autenticado con su
   token de Estada**. Estada devuelve un token de corta duración
   (`AUDIENCE_TOKEN_EXPIRE_MINUTES`, 15 min por defecto) con `aud=["compta"]`.

   ```http
   POST /api/v1/auth/token
   Authorization: Bearer <token estada>
   Content-Type: application/json

   {"audience": "compta"}
   ```

   Respuesta:

   ```json
   {
     "access_token": "<jwt rs256>",
     "token_type": "bearer",
     "expires_in": 900,
     "audience": "compta"
   }
   ```

## Validación en la app destino (Compta)

Compta **no comparte secreto** con Estada. Para validar un token:

1. Obtener el JWKS de Estada (`GET /.well-known/jwks.json`) y cachearlo.
2. Seleccionar la clave por el `kid` del header JWT.
3. Verificar firma `RS256`, `iss == "https://estada.sapedrera.eu"` y
   `"compta" in aud`.
4. Verificar `exp` (no expirado).
5. Mapear `sub` / `tenant_id` / `roles` a la sesión local de Compta.

> **Un token de Estada (`aud=["estada"]`) NO es válido para Compta, y viceversa.**
> Estada también rechaza los tokens emitidos para otra audiencia.

## Audiencias permitidas

`JWT_ALLOWED_AUDIENCES` (configurable): `estada`, `compta`, `comanda`,
`jornada`, `ariadna`.

## Migración del login de Compta

Durante la transición, **Compta mantiene su propio login** y además acepta el
JWT global de Estada. Cuando el flujo global esté rodado y probado en los dos
lados, se retira el login propio.

## Configuración relevante (Estada)

| Variable | Default | Descripción |
|---|---|---|
| `JWT_ISSUER` | `https://estada.sapedrera.eu` | Valor de `iss` |
| `JWT_AUDIENCE` | `estada` | Audiencia por defecto (la propia app) |
| `JWT_ALLOWED_AUDIENCES` | `estada,compta,comanda,jornada,ariadna` | Audiencias que se pueden pedir |
| `JWT_PRIVATE_KEY_PATH` | `keys/jwt_private.pem` | Clave privada de firma |
| `AUDIENCE_TOKEN_EXPIRE_MINUTES` | `15` | Caducidad del token de audiencia |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Caducidad del access token de Estada |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Caducidad del refresh token |
