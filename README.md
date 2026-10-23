# SST SaaS — Gestión documental de Seguridad y Salud en el Trabajo

Plataforma SaaS multi-tenant para que un Gestor SST administre el portafolio documental
de varias empresas: carpetas, archivos con control de vencimiento, auditorías internas del
SG-SST y trazabilidad de acciones.

## Stack

- **Backend:** Python · FastAPI · SQLAlchemy 2.0
- **Base de datos:** PostgreSQL (Docker)
- **Frontend:** React 18 · Vite · Tailwind CSS
- **Seguridad:** JWT (Bearer) · bcrypt · aislamiento multi-tenant por `X-Company-Id`

## Arranque rápido

Requisitos (máquina limpia): **Git, Docker Desktop, Node.js 18+, Python 3.11+**.

```bash
git clone https://github.com/Scrum-2-tech/SST-SAAS.git
cd SST-SAAS

# 1) Base de datos
docker compose up -d

# 2) Backend  (en backend/)
cd backend
copy .env.example .env            # Windows:  Copy-Item .env.example .env
python -m venv .venv
.venv\Scripts\activate            # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python -c "from src.database import engine, Base; import src.models; Base.metadata.create_all(engine)"
python -m uvicorn src.main:app --reload

# 3) Frontend  (en frontend/, otra terminal)
cd frontend
npm install                       # Windows con PowerShell bloqueado: npm.cmd install
npm run dev                       # o: npm.cmd run dev
```

- Frontend: http://localhost:4200
- Backend / API docs: http://localhost:8000/docs

## Documentación

- **[guia.md](./guia.md)** — Guía completa paso a paso (instalación desde cero, demo, troubleshooting).
- **[ARQUITECTURA.md](./ARQUITECTURA.md)** — Diagramas de arquitectura, modelo de datos y flujos.
- **[docs/](./docs/)** — Documentación funcional del proyecto.

> Para una demostración, correr en local es lo más confiable. Ver la sección de despliegue
> en la nube de `guia.md` para la hoja de ruta de publicación en internet.
