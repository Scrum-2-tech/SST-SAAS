# 🛠️ Estructura del Proyecto y Dependencias (Configuración de UV)

## 🏗️ Árbol de Directorios
```text
sst-saas/
├── .gitignore
├── README.md
├── backend/                  <--- Microservicio FastAPI
│   ├── .venv/
│   ├── pyproject.toml        <--- Configuración de UV
│   ├── uv.lock
│   ├── storage/              <--- Almacenamiento local de archivos (ignorado en git)
│   └── src/
│       ├── main.py           <--- Entrada de la API
│       ├── config.py         <--- Carga de variables .env
│       ├── database.py       <--- Sesión de SQLAlchemy
│       ├── models.py         <--- Modelos de Base de Datos
│       ├── schemas.py        <--- Esquemas de Pydantic
│       └── routers/
│           ├── auth.py
│           ├── folders.py
│           └── files.py
└── frontend/                 <--- Aplicación Angular
```

## 📦 Inicialización del Backend con UV
Comandos exactos para ejecutar en la terminal de tu casa al empezar:

```bash
# 1. Crear carpeta del proyecto e ingresar
mkdir sst-saas && cd sst-saas

# 2. Inicializar el backend con UV
mkdir backend && cd backend
uv venv
uv pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-jose passlib bcrypt python-multipart
```

### Explicación de librerías clave:
- `fastapi` + `uvicorn`: Motor de la API y servidor.
- `sqlalchemy` + `psycopg2-binary`: ORM y conector nativo para PostgreSQL.
- `python-jose` + `passlib[bcrypt]`: Generación de tokens JWT y encriptación de contraseñas.
- `python-multipart`: **Obligatoria** en FastAPI para poder recibir archivos y fotos mediante formularios web.
