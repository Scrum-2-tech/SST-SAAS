"""
database.py
===========
Configuración de la capa de persistencia con SQLAlchemy 2.0 para PostgreSQL.

Responsabilidades:
    - Crear el motor (engine) de conexión a PostgreSQL leyendo DATABASE_URL.
    - Definir la clase Base declarativa de la que heredan todos los modelos.
    - Proveer la fábrica de sesiones (SessionLocal).
    - Exponer la dependencia 'get_db' para inyección en los endpoints de FastAPI.

La configuración (DATABASE_URL) se obtiene del objeto 'settings' de config.py,
que es la única fuente de verdad para las variables de entorno (lee el .env).
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import settings


# ---------------------------------------------------------------------------
# Motor de conexión (Engine)
# ---------------------------------------------------------------------------
# La URL de conexión proviene de settings.DATABASE_URL (cargada del .env).
# Formato esperado: postgresql://usuario:password@servidor:5432/sst_db
# - pool_pre_ping=True: verifica que la conexión siga viva antes de usarla,
#   evitando errores por conexiones cerradas por el servidor.
# - echo=False: en producción no imprime el SQL. Cambiar a True para depurar.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)


# ---------------------------------------------------------------------------
# Base declarativa (SQLAlchemy 2.0)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Clase base declarativa de la que heredan todos los modelos ORM."""


# ---------------------------------------------------------------------------
# Fábrica de sesiones
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Dependencia de FastAPI para obtener una sesión por request
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """Provee una sesión de base de datos por petición y la cierra al terminar.

    Uso en un endpoint (FASE 2+):
        @router.get("/ejemplo")
        def ejemplo(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
