# 🚀 Manual de Arranque Doméstico y Plan de Despliegue Comercial — SST-SAAS

Este documento contiene las instrucciones precisas para replicar el entorno de desarrollo en cualquier computadora (como tu casa), el flujo de pruebas sugerido para la demostración de venta y la estrategia de infraestructura para subir el sistema a servidores en la nube.

---

## 🏠 1. Guía de Arranque Rápido al Llegar a Casa (Hoy mismo)

Cuando descargues el código en tu computadora personal, el entorno estará totalmente limpio. Sigue estos pasos en orden para encender todo el ecosistema en menos de 5 minutos:

### Paso A: Clonar el Proyecto y Levantar Docker
1. Abre tu terminal (PowerShell o CMD) y descarga tu código:
   ```bash
   git clone https://github.com
   cd SST-SAAS
   ```
2. Asegúrate de tener **Docker Desktop** abierto y ejecutándose en tu barra de tareas.
3. Levanta el contenedor de la base de datos de PostgreSQL en segundo plano:
   ```bash
   docker compose up -d
   ```

### Paso B: Reconstruir y Encender el Backend (FastAPI)
1. Abre una terminal dentro de la carpeta `backend/`:
   ```bash
   cd backend
   ```
2. Crea el entorno virtual de Python e instala todas las dependencias acumuladas en un solo golpe con `uv`:
   ```bash
   uv venv
   uv pip install fastapi uvicorn "python-jose[cryptography]" bcrypt pydantic-settings "psycopg[binary]" sqlalchemy aiofiles email-validator
   ```
3. **Sincronizar la Base de Datos vacía de tu casa:** Ejecuta esta línea para inyectar las tablas limpias dentro del Docker:
   ```bash
   uv run python -c "from src.database import engine, Base; from src import models; Base.metadata.create_all(engine)"
   ```
4. Enciende el servidor del backend en modo desarrollo:
   ```bash
   uv run uvicorn src.main:app --reload
   ```
   *(Deja esta terminal abierta. Estará escuchando en el puerto 8000).*

### Paso C: Reconstruir y Encender el Frontend (Angular + Tailwind v4)
1. **Abre una segunda terminal nueva** de Windows, ubícate en la raíz del proyecto y entra a la carpeta del cliente visual:
   ```bash
   cd C:\Ruta\A\Tu\SST-SAAS\frontend
   ```
2. Descarga e instala los paquetes de Node locales y el compilador de Tailwind v4:
   ```bash
   npm install
   ```
3. Enciende el servidor visual de Angular:
   ```bash
   npm start
   ```
4. Abre tu navegador e ingresa a: 👉 **http://localhost:4200**

---

## 🧭 2. Guion de Demostración para el Comprador (Flujo de Pruebas)

Sigue este orden exacto en la pantalla para deslumbrar a la persona a la que le vas a vender el software:

1. **Registro Seguro:** Entra a `/register` y crea un usuario de prueba. Explica que el sistema hashea las contraseñas con el algoritmo industrial `bcrypt` y fuerza el rol de **Gestor SST** para evitar vulnerabilidades.
2. **Inicio de Sesión (JWT):** Inicia sesión. Explica que el sistema genera un token de seguridad JWT de alta duración que se almacena de forma segura en la memoria viva (*Signals de Angular 22*), haciéndola inmune a bloqueos de privacidad del navegador.
3. **Módulo Multi-Tenant en Caliente:** Abre el selector superior, crea la empresa (*Ej: Constructora Horizonte S.A.S.* con su NIT). Muestra cómo Angular cambia el portafolio instantáneamente e inyecta la cabecera `X-Company-Id` de forma invisible sin tener que cerrar sesión.
4. **Nube Documental SST:** Crea una carpeta (*Ej: "Exámenes Médicos Ocupacionales"*), sube un archivo PDF real, marca su nivel de criticidad (Ley 1562) y ponle una fecha de vencimiento. Muestra los **badges automáticos de colores**: Verde (Vigente), Naranja (Por Vencer) o Rojo (Vencido).
5. **Descarga en Bloques (Streaming Chunks):** Descarga el archivo. Explica que el backend lee el PDF en fragmentos asíncronos (`aiofiles`) y lo entrega como un `Blob` de datos dinámico. La ruta física en el disco duro está oculta; nadie puede adivinar la URL para hackear los documentos de salud o matrices de riesgos.
6. **Historial de Auditoría Legal:** Haz clic en la barra lateral e ingresa al historial. Muestra la tabla detallada donde queda registrado qué usuario, a qué hora, sobre qué empresa y desde qué **dirección IP exacta** se manipuló el documento. Esto blinda jurídicamente a la empresa ante inspecciones del Ministerio del Trabajo.

---

## 🏢 3. Guía de Despliegue en la Nube (Pasos para subirlo a internet)

Para que tu cliente y sus empresas aliadas puedan entrar a la aplicación desde cualquier parte del mundo usando internet, se deben contratar y acoplar los siguientes servicios en la nube:

### 🗄️ A. Servidor de Base de Datos (PostgreSQL)
* **Proveedor Recomendado:** *Supabase* o *Railway* (Tienen planes gratuitos iniciales).
* **Acción:** Creas una cuenta, obtienes la cadena de conexión de producción y la colocas en el archivo `.env` del servidor. Las tablas se autogenerarán solas gracias al script de inicialización.

### ⚙️ B. Servidor de Cómputo (Backend en FastAPI)
* **Proveedor Recomendado:** *Render* o *Railway* (Plan básico de \$5 a \$7 USD al mes).
* **Acción:** Vinculas tu cuenta de GitHub/GitLab. El servidor detectará el backend, instalará las dependencias de Python y levantará el servicio de Uvicorn automáticamente en la nube. Las variables confidenciales del `.env` se escriben en el panel de control del proveedor para máxima seguridad.

### 💾 C. Almacenamiento en la Nube para los PDFs (Storage)
* **Estado Actual:** El backend guarda los archivos directamente en el almacenamiento local del servidor en la ruta `./storage/`.
* **Escalamiento Comercial:** Si tu cliente empieza a subir gigabytes de archivos pesados, simplemente se configura el archivo `.env` para desviar las subidas por fragmentos de forma directa hacia **Amazon S3** o **Google Cloud Storage**, pagando centavos de dólar por almacenamiento masivo sin saturar la memoria RAM ni el disco de tu servidor principal.

### 🎨 D. Servidor Web para la Interfaz Gráfica (Angular)
* **Proveedor Recomendado:** *Vercel* o *Netlify* (Completamente **Gratis** para aplicaciones Angular frontend).
* **Acción:** En tu consola local ejecutas el comando `ng build`. Esto generará una carpeta llamada `dist/frontend`. Subes esa carpeta a Vercel, y el sistema distribuirá tus pantallas de Tailwind v4 a través de una red global (CDN), haciendo que cargue instantáneamente en cualquier celular o PC.
* **Dominio:** Compras un dominio web (ej: `tu-plataformasst.com`) en GoDaddy o Namecheap y lo enlazas a Vercel con un par de clics para darle la cara comercial definitiva a tu negocio.
