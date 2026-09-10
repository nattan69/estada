"""Test de humo: verifica que la API arranca, hace bootstrap y autentica."""
import os
import sys
from pathlib import Path

# Asegura que `backend` esté en sys.path para poder hacer `import app`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# SQLite en /tmp (limpio) para no tocar la BD de desarrollo. Antes de importar app.
DB = '/tmp/estada_test.db'
Path(DB).unlink(missing_ok=True)
os.environ['DATABASE_URL'] = f'sqlite:///{DB}'

from fastapi.testclient import TestClient
from app.main import app


def test_health_y_login():
    with TestClient(app) as c:
        assert c.get('/health').json() == {'status': 'ok'}

        r = c.post(
            '/api/v1/auth/login',
            json={'email': 'admin@estada.local', 'password': 'cambia-esta-contrasenya'},
        )
        assert r.status_code == 200
        body = r.json()
        assert 'access_token' in body and 'refresh_token' in body

        me = c.get(
            '/api/v1/auth/me',
            headers={'Authorization': f"Bearer {body['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()['role'] == 'owner'
