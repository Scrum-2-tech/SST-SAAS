# 📅 Plan de Trabajo por Fases (Entorno Local a Producción)

## 📌 Fase 1: Cimientos del Backend (FastAPI + UV)
- [ ] Inicializar repositorio Git y entorno virtual con `uv venv`.
- [ ] Configurar variables de entorno (`.env`) y conexión a PostgreSQL con SQLAlchemy.
- [ ] Crear el modelo de base de datos relacional (Empresas, Usuarios, Carpetas, Archivos).
- [ ] Generar migraciones iniciales.

## 📌 Fase 2: Autenticación y Filtro de Portafolios (Gestores e Independientes)
- [ ] Crear endpoints de Registro e Inicio de sesión para el Gestor SST (JWT tokens).
- [ ] Implementar el módulo de "Clientes": El Gestor puede crear una nueva empresa en su lista (`POST /companies`).
- [ ] Desarrollar la dependencia global `get_current_tenant` en FastAPI: 
      Cada vez que el Gestor abra una carpeta o suba un archivo, Angular enviará en la cabecera el `company_id` de la empresa cliente seleccionada. FastAPI validará que ese gestor realmente sea el dueño de ese portafolio antes de mostrar nada.

## 📌 Fase 3: Sistema de Gestión Documental (Filesystem)
- [ ] Crear endpoints de carpetas (`POST /folders`, `GET /folders`).
- [ ] Programar la lógica de subida de archivos en bloques (*chunks*) usando `UploadFile` y guardado local en `./storage/`.
- [ ] Probar peticiones de subida y lectura mediante el archivo `pruebas.http`.

## 📌 Fase 4: Interfaz de Usuario (Angular)
- [ ] Inicializar proyecto Angular con Tailwind CSS.
- [ ] Crear pantallas de Login y Dashboard principal.
- [ ] Diseñar el explorador visual de carpetas (Vista de cuadrícula/lista y componente recursivo de árbol).
- [ ] Conectar los servicios de Angular con la API de FastAPI.

## 📌 Fase 5: Despliegue Temporal (Pruebas Cloud)
- [ ] Montar la base de datos PostgreSQL y la API en Render.com o Railway.app.
- [ ] Desplegar el frontend de Angular en Vercel de forma gratuita.
- [ ] Cambiar el almacenamiento local por Cloudflare R2 / AWS S3.
