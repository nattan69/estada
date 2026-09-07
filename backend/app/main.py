from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import engine, Base
from .models import models  # Importar modelos para que SQLAlchemy los registre
from .api.routes import auth, properties, room_types

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización automática del esquema de la base de datos.
    # Fase 0: create_all (idempotente). Sin migraciones Alembic por ahora.
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title='Estada PMS API', version='0.1.0', lifespan=lifespan)

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

# Inclusión de routers
app.include_router(auth.router, prefix='/api/v1/auth', tags=['Auth'])
app.include_router(properties.router, prefix='/api/v1/properties', tags=['Properties'])
app.include_router(room_types.router, prefix='/api/v1/room-types', tags=['Room Types'])

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
