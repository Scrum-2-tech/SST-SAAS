# 🔒 Ficha Técnica y Seguridad de la Información (SST Document Cloud)

*Usa estos argumentos mañana en la reunión si te preguntan cómo vas a garantizar que los datos de las empresas estén seguros y la aplicación sea rápida.*

## 1. Seguridad Multi-Tenant y Aislamiento de Datos
- **Seguridad a Nivel de Fila (Row-Level Isolation):** Cada tabla de la base de datos (`folders`, `files`) requiere obligatoriamente una columna `company_id`. 
- **Validación por Token:** El Backend (FastAPI) intercepta cada petición y extrae el ID de la empresa directamente del token JWT cifrado del usuario. Si un usuario intenta modificar la URL para ver datos de otra empresa, el sistema arrojará un error `HTTP 403 Forbidden` de inmediato de forma automatizada.

## 2. Gestión de Vencimientos de Documentos (Requisito Clave SST)
Para cumplir con los estándares de Seguridad y Salud en el Trabajo, la tabla de **Archivos** contará con metadatos específicos:
- `is_critical`: Booleano para identificar documentos obligatorios por ley (ej. Matriz de Riesgos).
- `expiration_date`: Campo de tipo fecha.
- `status`: Estado calculado automáticamente por el backend (`Vigente`, `Por Vencer` [últimos 30 días], `Vencido`).
- **Lógica de Alertas:** Un servicio interno (*Cron job*) en Python revisará la base de datos una vez al día a las 00:00 y enviará alertas por correo al Gestor SST si un documento crucial está por vencerse.

## 3. Variables de Entorno Clave (`.env`)
*Este archivo oculto protegerá las contraseñas e ingresos a los servidores de producción:*

```env
DATABASE_URL=postgresql://usuario:password@servidor:5432/sst_db
SECRET_KEY=clave_secreta_super_larga_y_cifrada_para_los_tokens_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
STORAGE_TYPE=LOCAL # Cambiar a 'R2' o 'S3' en producción
CLOUDFLARE_R2_BUCKET_NAME=sst-document-vault
CLOUDFLARE_R2_ACCESS_KEY=tu_llave_de_acceso
```
