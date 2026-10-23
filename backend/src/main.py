"""
main.py
=======
Punto de entrada de la API FastAPI del SaaS Multi-tenant de SST.

Responsabilidades:
    - Instanciar la aplicación FastAPI.
    - Habilitar CORS para permitir la conexión del frontend Angular.
    - Registrar los routers de autenticación y empresas.

Para levantar el servidor en desarrollo (desde la carpeta 'backend/'):
    uv run uvicorn src.main:app --reload
Luego abrir la documentación interactiva en: http://localhost:8000/docs
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import audit, auth, companies, files, folders, sst_audits

# ---------------------------------------------------------------------------
# Instancia de la aplicación
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SST SaaS - API",
    description="Backend multi-tenant para la gestión documental de SST.",
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------
# Orígenes permitidos para el frontend Angular en desarrollo.
# En producción, reemplazar por el dominio real y evitar "*".
origenes_permitidos = [
    "http://localhost:4200",  # Angular dev server por defecto.
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Registro de routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(audit.router)
app.include_router(sst_audits.router)


# ---------------------------------------------------------------------------
# Endpoint de salud (health check)
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Sistema"])
def health_check() -> dict[str, str]:
    """Verifica que la API esté arriba y respondiendo."""
    return {"status": "ok"}
