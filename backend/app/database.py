from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

# Configuración del motor de base de datos.
# `check_same_thread` es un argumento exclusivo de SQLite: psycopg2 (Postgres)
# lo rechaza con "invalid connection option". Solo se pasa cuando la BD es SQLite.
connect_args = {'check_same_thread': False} if settings.DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Fábrica de sesiones
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Clase base para los modelos declarativos
class Base(DeclarativeBase):
    pass

# Dependencia para obtener la sesión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
