# 🚀 SST SaaS — Guía de Arranque y Presentación

Manual completo para levantar el proyecto **desde cero en una máquina limpia** (Windows),
probarlo y presentarlo. Pensado para que cualquiera del equipo lo encienda sin ayuda.

> **Stack real del proyecto**
>
> - **Backend:** Python + FastAPI + SQLAlchemy 2.0
> - **Base de datos:** PostgreSQL (en Docker)
> - **Frontend:** React 18 + Vite + Tailwind CSS
> - **Autenticación:** JWT (Bearer) + multi-tenant por header `X-Company-Id`

---

## 📦 0. Programas que hay que instalar (máquina vacía)

Instala estos cuatro antes de empezar. Enlaces oficiales:

| Programa              | Para qué                           | Dónde                                           |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| **Git**               | Descargar el código                | https://git-scm.com/downloads                   |
| **Docker Desktop**    | Correr la base de datos PostgreSQL | https://www.docker.com/products/docker-desktop/ |
| **Node.js 18+ (LTS)** | Correr el frontend (incluye `npm`) | https://nodejs.org/                             |
| **Python 3.11+**      | Correr el backend                  | https://www.python.org/downloads/               |

> Al instalar **Python**, marca la casilla **"Add Python to PATH"**.
> Al instalar **Node.js**, deja todas las opciones por defecto.
> Reinicia la terminal (o el PC) después de instalar, para que reconozca los comandos.

### Verifica que quedaron instalados

Abre una terminal nueva (PowerShell) y corre:

```powershell
git --version
docker --version
node --version
python --version
```

Si cada uno responde con un número de versión, vas bien.

---

## ⚠️ Nota crítica para Windows + PowerShell (LÉELA)

En muchas instalaciones de Windows, PowerShell **bloquea la ejecución de `npm`** con un error
como _"no se puede cargar el archivo npm.ps1 porque la ejecución de scripts está deshabilitada"_.

Tienes dos formas de resolverlo (elige una):

**Opción 1 — Usar `npm.cmd` en vez de `npm` (rápido, no cambia nada del sistema).**
Cada vez que la guía diga `npm ...`, escribe `npm.cmd ...`. Ejemplo: `npm.cmd install`.

**Opción 2 — Desbloquear scripts para tu usuario (una sola vez).**

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Después de esto, `npm` normal ya funciona. (Esta guía usa `npm.cmd` por seguridad.)

---

## 🏠 1. Arranque paso a paso (unos 5–10 minutos)

Necesitarás **TRES terminales** abiertas al final: base de datos, backend y frontend.

### Paso A — Descargar el código

```powershell
git clone https://github.com/Scrum-2-tech/SST-SAAS.git
cd SST-SAAS
```

### Paso B — Levantar la base de datos (Docker)

1. Abre **Docker Desktop** y espera a que diga _"Engine running"_.
2. Desde la raíz del proyecto (`SST-SAAS/`):
   ```powershell
   docker compose up -d
   ```
   Esto crea el contenedor de PostgreSQL `sst_postgres_container` escuchando en el puerto `5432`.
3. Verifica que está arriba:
   ```powershell
   docker ps
   ```

### Paso C — Configurar y encender el BACKEND (FastAPI)

Abre una terminal **dentro de la carpeta `backend/`**:

```powershell
cd backend
```

1. **Crear el archivo `.env`** copiando el ejemplo:

   ```powershell
   Copy-Item .env.example .env
   ```

   (Los valores por defecto ya coinciden con la base de datos de Docker; no hay que tocar nada en local.)

2. **Crear el entorno virtual e instalar dependencias:**

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

   > Si `Activate.ps1` da error de permisos, usa la Opción 2 de la nota de PowerShell de arriba,
   > o activa con: `.venv\Scripts\activate.bat`

3. **Crear las tablas en la base de datos** (la BD de Docker arranca vacía):

   ```powershell
   python -c "from src.database import engine, Base; import src.models; Base.metadata.create_all(engine); print('Tablas creadas')"
   ```

   Esto crea las 7 tablas: `users`, `companies`, `folders`, `files`, `audit_logs`,
   `sst_audits`, `sst_findings`.

4. **Encender el servidor del backend:**
   ```powershell
   python -m uvicorn src.main:app --reload
   ```
   Déjalo corriendo. Escucha en **http://localhost:8000**.
   La documentación interactiva de la API queda en **http://localhost:8000/docs**.

### Paso D — Encender el FRONTEND (React + Vite)

Abre una **tercera terminal**, en la carpeta `frontend/`:

```powershell
cd frontend
```

1. **Instalar dependencias de Node:**
   ```powershell
   npm.cmd install
   ```
2. **Encender el servidor visual:**
   ```powershell
   npm.cmd run dev
   ```
3. Abre el navegador en 👉 **http://localhost:4200**

> El frontend corre en el puerto **4200** a propósito: el backend solo permite
> conexiones (CORS) desde esa dirección. No lo cambies sin ajustar el backend.

### Paso E — Crear el primer usuario

No hay usuarios por defecto (la BD arranca vacía). En la pantalla de login:

1. Clic en **"Regístrate"**.
2. Crea un usuario con correo y una contraseña segura (mín. 8 caracteres, con mayúscula,
   minúscula, número y símbolo). El sistema lo registra como rol **Gestor**.
3. Inicia sesión con ese usuario.

---

## 🧭 2. Guion de demostración (qué mostrar y qué decir)

Sigue este orden en pantalla:

1. **Registro seguro.** Crea una cuenta. Las contraseñas se guardan cifradas con **bcrypt**
   (nunca en texto plano) y el rol se fuerza a _Gestor_ por seguridad.
2. **Inicio de sesión (JWT).** Al entrar, el sistema emite un **token JWT** que autentica
   cada petición al backend.
3. **Guía de inicio.** Entra a la sección **"Guía de inicio"**: explica paso a paso qué hace
   cada módulo. Útil para alguien que empieza en SST.
4. **Multi-empresa (multi-tenant).** En **Empresas**, crea una empresa (razón social + NIT).
   El selector superior permite cambiar de empresa activa al instante; el sistema envía
   la cabecera `X-Company-Id` de forma invisible para aislar los datos de cada empresa.
5. **Estructura guía SST.** En **Carpetas**, usa el botón **"Crear estructura guía SST"**:
   genera de un clic las 36 carpetas estándar del SG-SST según la **Resolución 0312 de 2019**
   (ciclo PHVA). Esto diferencia el producto: le ahorra días de trabajo al cliente.
6. **Nube documental con control de vencimientos.** En **Archivos**, sube un PDF, ponle fecha
   de vencimiento y márcalo como **"Exigido por ley"**. Muestra los badges automáticos:
   Vigente (verde), Por Vencer (ámbar), Vencido (rojo). Usa los filtros por estado.
7. **Dashboard.** Muestra el resumen: total de documentos, vigentes, por vencer, vencidos,
   exigidos por ley, y las alertas de vencimiento.
8. **Auditorías SST.** En **Auditorías SST**, crea una auditoría interna, registra hallazgos
   (conformidad / no conformidad mayor-menor / observación), con plan de acción y responsable.
   Este es el módulo de negocio propio de SST (Decreto 1072 de 2015).
9. **Trazabilidad.** En **Trazabilidad**, muestra el registro técnico: qué usuario hizo qué,
   cuándo y desde qué IP. Blinda jurídicamente ante inspecciones del Ministerio del Trabajo.
   _(Esta sección y Auditorías SST solo son visibles para Gestor/SuperAdmin.)_

---

## 🔐 3. Roles del sistema

| Rol                 | Qué puede hacer                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **SuperAdmin**      | Control global: ve todas las empresas del sistema.                                                                         |
| **Gestor**          | Dueño de su portafolio: crea empresas, sube documentos, gestiona auditorías y ve la trazabilidad. Es el cliente principal. |
| **Vista_Auditoria** | Solo lectura del portafolio de UNA empresa. NO ve la trazabilidad ni gestiona auditorías.                                  |

El control de roles está aplicado **en el backend** (devuelve 403 si no hay permiso) y
**en el frontend** (oculta los menús restringidos según el rol).

---

## 🛑 4. Cómo apagar todo

- En las terminales del backend y frontend: `Ctrl + C`.
- Para apagar la base de datos (sin borrar los datos):
  ```powershell
  docker compose stop
  ```
- Para apagarla y **borrar** el contenedor (los datos persisten en el volumen):
  ```powershell
  docker compose down
  ```

---

## 🧯 5. Solución de problemas comunes

| Problema                                              | Causa / Solución                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm.ps1 ... ejecución de scripts está deshabilitada` | Usa `npm.cmd` o aplica `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.        |
| `Port 4200 is already in use`                         | Ya hay un Vite corriendo. Ciérralo o libera el puerto.                               |
| El frontend carga pero no trae datos / errores de red | El backend no está arriba, o no en el puerto 8000. Revisa la terminal del backend.   |
| `connection refused` / el backend no conecta a la BD  | Docker no está corriendo o el contenedor está apagado. Corre `docker compose up -d`. |
| `.venv\Scripts\Activate.ps1` da error de permisos     | Usa `.venv\Scripts\activate.bat` o desbloquea scripts (Opción 2).                    |
| Olvidé la contraseña de un usuario                    | No se puede recuperar (está cifrada). Crea otro usuario o resetea el hash en la BD.  |

---

## 🏢 6. Despliegue en la nube (más adelante, NO para la demo)

> La demo de mañana corre **en local**, que es lo más confiable. Esta sección es la hoja de
> ruta para cuando se decida publicarlo en internet. Requiere crear cuentas y, en algunos
> casos, pagar planes básicos.

- **Base de datos:** PostgreSQL gestionado en _Supabase_, _Neon_ o _Railway_ (tienen plan gratis inicial).
- **Backend (FastAPI):** _Render_ o _Railway_. Se conecta al repositorio Git y se despliega solo;
  las variables del `.env` se cargan en el panel del proveedor. Hay que ajustar el CORS para el
  dominio real del frontend.
- **Almacenamiento de archivos:** hoy es en disco local (`backend/storage/`). En la mayoría de
  hostings el disco **se borra en cada redeploy**, así que para producción hay que migrar a
  **Amazon S3** / **Google Cloud Storage** (trabajo adicional).
- **Frontend (React/Vite):** _Vercel_ o _Netlify_ (gratis). Se hace `npm run build` y se publica
  la carpeta `dist/`. Hay que apuntar la URL del backend de producción en `src/api/client.js`.

---

## 📁 7. Estructura del proyecto

```
SST-SAAS/
├─ backend/                 # API FastAPI
│  ├─ src/
│  │  ├─ main.py            # App y registro de routers
│  │  ├─ models.py          # Modelos de BD (SQLAlchemy)
│  │  ├─ schemas.py         # Validación (Pydantic)
│  │  ├─ database.py        # Conexión a PostgreSQL
│  │  ├─ security.py        # Hashing + JWT
│  │  ├─ dependencies.py    # Auth y multi-tenant
│  │  └─ routers/           # Endpoints (auth, companies, folders, files, audit, sst_audits)
│  ├─ requirements.txt      # Dependencias Python
│  └─ .env.example          # Plantilla de variables de entorno
├─ frontend/                # App React + Vite + Tailwind
│  ├─ src/
│  │  ├─ pages/             # Pantallas (Login, Dashboard, Companies, Folders, Files, SstAudits, Audit, Guide)
│  │  ├─ components/        # Layout y componentes de UI
│  │  ├─ context/           # AuthContext (sesión y rol)
│  │  ├─ api/               # Cliente axios y endpoints
│  │  └─ data/              # Plantilla de carpetas SST
│  └─ .env.example
├─ docs/                    # Documentación funcional del proyecto
├─ docker-compose.yml       # Base de datos PostgreSQL
├─ ARQUITECTURA.md          # Diagrama de arquitectura (Mermaid)
└─ guia.md                  # Este archivo
```
