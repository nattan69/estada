from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

# Inicialización de la aplicación FastAPI
app = FastAPI(title='Estada PMS API', version='0.1.0')

# Configuración de CORS para permitir peticiones desde los orígenes definidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

# Ruta de comprobación de estado (health check)
@app.get('/health')
def health():
    return {'status': 'ok'}
