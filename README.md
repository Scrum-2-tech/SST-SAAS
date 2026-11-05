# SST SaaS

Aplicación para gestionar empresas, carpetas y documentos del SG-SST, auditorías internas y trazabilidad.

## ¿Dónde está el código?

El proyecto está organizado así:

| Ruta | Contenido |
| --- | --- |
| `backend/` | API FastAPI, modelos, rutas y migraciones de base de datos. |
| `frontend/` | Interfaz React/Vite. |
| `backend/migrations/` | Migraciones SQL para bases de datos existentes. |
| `guia.md` | Guía detallada de instalación, uso, demostración y solución de problemas. |
| `ARQUITECTURA.md` y `docs/` | Arquitectura y documentación funcional. |

En esta sesión de trabajo, el repositorio está en `/home/nicolasflorez/Documentos/copilot-worktrees/SST-SAAS/scrum-2-tech-silver-parakeet`. Si haces un clon normal, los archivos estarán dentro de la carpeta `SST-SAAS` que se cree donde ejecutes `git clone`.

> **Importante sobre las mejoras:** los cambios de esta sesión están confirmados en la rama local `scrum-2-tech-sst-saas-improvements`, pero esa rama todavía no está publicada en GitHub. Un clon de GitHub por sí solo no incluye esos commits hasta que se publique la rama o se integren los cambios.

## Requisitos

- Git
- Docker con el complemento `docker compose`
- Python 3.11 o superior
- Node.js 18 o superior (incluye npm)

## Arranque local en Linux

Clona el repositorio y entra en su carpeta:

```bash
git clone https://github.com/Scrum-2-tech/SST-SAAS.git
cd SST-SAAS
```

Inicia PostgreSQL en Docker:

```bash
docker compose up -d
docker compose ps
```

En la **primera terminal**, configura y arranca el backend:

```bash
cp backend/.env.example backend/.env
python3 -m venv backend/.venv
source backend/.venv/bin/activate
cd backend
pip install -r requirements.txt
python -c "from src.database import engine, Base; import src.models; Base.metadata.create_all(engine); print('Tablas creadas')"
cd ..
docker compose exec -T postgres_db psql -v ON_ERROR_STOP=1 -U postgres -d sst_db < backend/migrations/001_folder_notes_audit_checklist.sql
cd backend
python -m uvicorn src.main:app --reload
```

En una **segunda terminal**, situada en la carpeta raíz del repositorio `SST-SAAS`, instala y arranca el frontend:

```bash
cd frontend
npm install
npm run dev
```

Abre la aplicación en <http://localhost:4200>. La documentación interactiva de la API está en <http://localhost:8000/docs>.

La primera vez, selecciona **Regístrate** en la aplicación para crear una cuenta Gestor y luego registra una empresa. La base local de PostgreSQL inicia vacía.

## Siguientes veces

Después de completar la configuración inicial, basta con iniciar Docker y los dos servidores:

```bash
docker compose up -d
```

Terminal backend:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload
```

Terminal frontend:

```bash
cd frontend
npm run dev
```

Para apagar PostgreSQL, ejecuta `docker compose down` desde la raíz del proyecto. Los datos se conservan en el volumen de Docker. Para borrar también esos datos de forma permanente se necesita `docker compose down -v`; úsalo solo si quieres reiniciar la base desde cero.

## Windows

Para Windows y PowerShell, sigue la guía completa en [guia.md](./guia.md), que incluye los comandos específicos de ese sistema y pasos de solución de problemas.
