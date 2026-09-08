from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import engine, Base
from .models import models  # Importar modelos para que SQLAlchemy los registre
from .api.routes import auth, properties, room_types, rooms, rate_plans, rates, inventory, availability, reservations, folios, housekeeping, maintenance, reports, fiscal, tenants, guests, integrations, users, outbox
from .database import SessionLocal
from .services.bootstrap import bootstrap

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización automática del esquema de la base de datos.
    # Fase 0: create_all (idempotente). Sin migraciones Alembic por ahora.
    Base.metadata.create_all(bind=engine)
    # Bootstrap: tenant + usuari owner inicials (idempotent).
    with SessionLocal() as session:
        bootstrap(session)
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
app.include_router(rooms.router, prefix='/api/v1/rooms', tags=['Rooms'])
app.include_router(rate_plans.router, prefix='/api/v1/rate-plans', tags=['Rate Plans'])
app.include_router(rates.router, prefix='/api/v1/rates', tags=['Rates'])
app.include_router(inventory.router, prefix='/api/v1/inventory', tags=['Inventory'])
app.include_router(availability.router, prefix='/api/v1/availability', tags=['Availability'])
app.include_router(reservations.router, prefix='/api/v1/reservations', tags=['Reservations'])
app.include_router(folios.router, prefix='/api/v1/folios', tags=['Folios'])
app.include_router(housekeeping.router, prefix='/api/v1/housekeeping/tasks', tags=['Housekeeping'])
app.include_router(maintenance.router, prefix='/api/v1/maintenance', tags=['Maintenance'])
app.include_router(reports.router, prefix='/api/v1/reports', tags=['Reports'])
app.include_router(fiscal.router, prefix='/api/v1/fiscal', tags=['Fiscal'])
app.include_router(tenants.router, prefix='/api/v1/tenants', tags=['Tenants'])
app.include_router(guests.router, prefix='/api/v1/guests', tags=['Guests'])
app.include_router(integrations.router, prefix='/api/v1/integrations', tags=['Integrations'])
app.include_router(users.router, prefix='/api/v1/users', tags=['Users'])
app.include_router(outbox.router, prefix='/api/v1/outbox', tags=['Outbox'])

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
