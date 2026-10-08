# 🤖 Libro de Prompts (Optimización de Créditos)

> [!TIP]
> Copia y pega estos prompts en el chat de Kiro IDE o en Cursor para avanzar rápido sin desperdiciar saldo.

## Prompt 1: Generación de Modelos de Base de Datos (SQLAlchemy)
```text
Actúa como un Ingeniero de Software Senior experto en FastAPI y PostgreSQL. Necesito definir los modelos de SQLAlchemy para un SaaS Multi-tenant de SST. 
Genera el código para el archivo `models.py` con las siguientes entidades usando UUID como llaves primarias:
1. Company (id, name, nit)
2. User (id, company_id, email, password_hash, role)
3. Folder (id, company_id, name, parent_id referencing Folder.id nullable para subcarpetas infinitas)
4. File (id, folder_id, company_id, name, file_url, uploaded_at)
Asegura las llaves foráneas y las relaciones (relationship). Dame solo el código limpio sin explicaciones.
```

## Prompt 2: Lógica de Seguridad Multi-Tenant (FastAPI Dependency)
```text
Necesito crear una dependencia de seguridad en FastAPI para mi SaaS Multi-tenant. El código debe leer el token JWT del header 'Authorization', decodificarlo, verificar que el usuario exista en la base de datos y retornar un objeto 'current_user' que contenga su 'id', 'email' y fundamentalmente su 'company_id'. 
Si el token expira o es inválido, debe lanzar una HTTP 401 Exception. Proporcióname el código limpio para `routers/auth.py`.
```

## Prompt 3: Componente de Subida de Archivos Segura
```text
Escribe el endpoint 'POST /files/upload' en FastAPI. Debe recibir un parámetro 'file: UploadFile', un 'folder_id: UUID' opcional y la dependencia 'current_user'. 
El archivo debe guardarse físicamente en la carpeta local './storage/{company_id}/' fragmentado en bloques (chunks) para no saturar la RAM. Registra el archivo en la base de datos con la ruta del disco. Devuelve un JSON con el estado exitoso.
```
