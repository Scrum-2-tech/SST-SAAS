"""
routers/files.py
================
Endpoint de subida de archivos del Document Cloud SST.

- POST /files/upload : recibe un archivo (multipart/form-data) y sus metadatos
  SST, lo guarda físicamente en disco por bloques (chunks) y lo registra en BD.

Mitigaciones de riesgo aplicadas (doc 06 y análisis de la Fase 3):
    1. Path traversal / colisiones -> el archivo físico se nombra '{uuid4}.ext';
       el nombre original solo vive en la columna File.name.
    2. Tipo de archivo -> lista blanca por extensión + content-type (415 si no).
    3. Tamaño -> límite MAX_UPLOAD_MB contado durante el streaming (413 si se excede).
    4. Escritura parcial -> primero se escribe el archivo COMPLETO en disco;
       solo entonces se registra en BD. Si algo falla, se borra el archivo.
    5. Multi-tenant -> company_id SIEMPRE del tenant; folder_id (si viene) se
       valida contra el tenant.
    6. Trazabilidad -> se registra un AuditLog (action="SUBIR") tras el éxito.
"""

from __future__ import annotations

import os
import uuid
from datetime import date
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File as FastAPIFile,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.dependencies import get_current_tenant, get_current_user
from src.models import AuditLog, Company, File, Folder, User, UserRole
from src.schemas import FileOut

router = APIRouter(prefix="/files", tags=["Archivos"])

# Lista blanca de tipos permitidos (doc 01): PDF, PNG, JPG, DOCX, XLSX.
# Mapea extensión -> content-types MIME aceptados para esa extensión.
EXTENSIONES_PERMITIDAS: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
}

# Tamaño de cada bloque leído del stream: 1 MB (equilibra RAM y nº de lecturas).
CHUNK_SIZE = 1024 * 1024


@router.post(
    "/upload",
    response_model=FileOut,
    status_code=status.HTTP_201_CREATED,
    summary="Subir un archivo al portafolio (streaming por chunks)",
)
async def subir_archivo(
    request: Request,
    file: UploadFile = FastAPIFile(...),
    folder_id: Optional[uuid.UUID] = Form(default=None),
    is_critical: bool = Form(default=False),
    expiration_date: Optional[date] = Form(default=None),
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> File:
    """Sube un archivo de SST, lo persiste en disco por chunks y lo registra.

    El archivo se guarda en './{STORAGE_PATH}/{company_id}/{uuid}.ext'. El
    nombre original se conserva en BD para mostrarlo en la interfaz.
    """
    # --- 1. Validar la extensión y el content-type (lista blanca) ---
    nombre_original = file.filename or "archivo"
    extension = Path(nombre_original).suffix.lower()

    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                "Tipo de archivo no permitido. Formatos válidos: "
                "PDF, PNG, JPG, DOCX, XLSX."
            ),
        )
    if file.content_type not in EXTENSIONES_PERMITIDAS[extension]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El contenido del archivo no coincide con su extensión.",
        )

    # --- 2. Si viene folder_id, validar que la carpeta sea del tenant ---
    if folder_id is not None:
        carpeta = db.get(Folder, folder_id)
        if carpeta is None or carpeta.company_id != tenant.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La carpeta destino no existe en este portafolio.",
            )

    # --- 3. Preparar el directorio físico del tenant ---
    # Aislamiento en disco: cada empresa tiene su propia subcarpeta.
    directorio_tenant = Path(settings.STORAGE_PATH) / str(tenant.id)
    directorio_tenant.mkdir(parents=True, exist_ok=True)

    nombre_fisico = f"{uuid.uuid4()}{extension}"
    ruta_fisica = directorio_tenant / nombre_fisico

    # --- 4. Streaming por chunks a disco, controlando el tamaño máximo ---
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    bytes_escritos = 0

    try:
        async with aiofiles.open(ruta_fisica, "wb") as buffer:
            while chunk := await file.read(CHUNK_SIZE):
                bytes_escritos += len(chunk)
                if bytes_escritos > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"El archivo supera el límite de "
                            f"{settings.MAX_UPLOAD_MB} MB."
                        ),
                    )
                await buffer.write(chunk)

        # --- 5. Registrar en BD (el archivo YA está completo en disco) ---
        nuevo_archivo = File(
            company_id=tenant.id,  # <-- SIEMPRE del tenant resuelto.
            folder_id=folder_id,
            name=nombre_original,  # nombre "bonito" para la interfaz.
            file_url=str(ruta_fisica),  # ruta real en disco.
            is_critical=is_critical,
            expiration_date=expiration_date,
        )
        db.add(nuevo_archivo)

        # --- 6. Trazabilidad: registrar la acción en AuditLog ---
        cliente_ip = request.client.host if request.client else None
        registro_auditoria = AuditLog(
            user_id=current_user.id,
            company_id=tenant.id,
            action="SUBIR",
            details=f"Archivo '{nombre_original}' subido al portafolio.",
            ip_address=cliente_ip,
        )
        db.add(registro_auditoria)

        db.commit()
        db.refresh(nuevo_archivo)
        return nuevo_archivo

    except Exception:
        # Limpieza ante cualquier fallo: no dejar archivos huérfanos en disco.
        db.rollback()
        if ruta_fisica.exists():
            os.remove(ruta_fisica)
        raise
    finally:
        await file.close()



@router.get(
    "",
    response_model=list[FileOut],
    summary="Listar los archivos de la empresa activa",
)
def listar_archivos(
    tenant: Company = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[File]:
    """Lista todos los archivos del portafolio de la empresa activa.

    Blindaje multi-tenant: filtra estrictamente por tenant.id (resuelto desde
    el header X-Company-Id), por lo que es imposible ver archivos de otra
    empresa aunque se manipule la petición.
    """
    archivos = db.scalars(
        select(File).where(File.company_id == tenant.id)
    ).all()
    return list(archivos)


@router.get(
    "/{file_id}/download",
    summary="Descargar un archivo físico (registra auditoría 'DESCARGAR')",
)
def descargar_archivo(
    file_id: uuid.UUID,
    request: Request,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Entrega el archivo físico desde el disco y registra la descarga.

    Pasos:
        1. Buscar el registro en BD y validar que pertenezca al tenant activo
           (si no -> 404, sin revelar la existencia de archivos ajenos).
        2. Verificar que el archivo exista realmente en disco (si no -> 404).
        3. Registrar la acción "DESCARGAR" en AuditLog con la IP del usuario.
        4. Devolver el archivo con FileResponse, usando el nombre ORIGINAL
           para que el navegador lo descargue con un nombre legible.
    """
    # --- 1. Buscar y validar pertenencia al tenant ---
    archivo = db.get(File, file_id)
    if archivo is None or archivo.company_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo no existe en este portafolio.",
        )

    # --- 2. Verificar la existencia física en disco ---
    ruta_fisica = Path(archivo.file_url)
    if not ruta_fisica.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo no se encuentra en el almacenamiento.",
        )

    # --- 3. Registrar la descarga en AuditLog (trazabilidad doc 01) ---
    cliente_ip = request.client.host if request.client else None
    registro_auditoria = AuditLog(
        user_id=current_user.id,
        company_id=tenant.id,
        action="DESCARGAR",
        details=f"Archivo '{archivo.name}' descargado del portafolio.",
        ip_address=cliente_ip,
    )
    db.add(registro_auditoria)
    db.commit()

    # --- 4. Entregar el archivo con su nombre original (legible) ---
    return FileResponse(
        path=ruta_fisica,
        filename=archivo.name,
        media_type="application/octet-stream",
    )



@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un archivo (BD + disco) y registrar auditoría",
)
def eliminar_archivo(
    file_id: uuid.UUID,
    request: Request,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Elimina un archivo del portafolio: registro en BD y fichero en disco.

    Puntos clave:
        - Aislamiento: el archivo debe pertenecer al tenant activo (si no -> 404).
        - Permisos: Vista_Auditoria es solo lectura y NO puede borrar (-> 403).
        - Orden seguro: se borra PRIMERO el registro en BD (con commit) y DESPUÉS
          el fichero en disco. Si el disco fallara, el peor caso es un huérfano
          recuperable, nunca un registro apuntando a un archivo inexistente.
        - Trazabilidad: se registra AuditLog "ELIMINAR_ARCHIVO".
    """
    # --- Permisos: Vista_Auditoria no puede borrar ---
    if current_user.role == UserRole.VISTA_AUDITORIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para eliminar archivos.",
        )

    # --- Aislamiento: el archivo debe ser del tenant activo ---
    archivo = db.get(File, file_id)
    if archivo is None or archivo.company_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo no existe en este portafolio.",
        )

    nombre_original = archivo.name
    ruta_fisica = Path(archivo.file_url)

    # --- Borrado en BD + auditoría (una sola transacción) ---
    db.delete(archivo)
    cliente_ip = request.client.host if request.client else None
    db.add(
        AuditLog(
            user_id=current_user.id,
            company_id=tenant.id,
            action="ELIMINAR_ARCHIVO",
            details=f"Archivo '{nombre_original}' eliminado del portafolio.",
            ip_address=cliente_ip,
        )
    )
    db.commit()

    # --- Limpieza de disco (tras confirmar el borrado en BD) ---
    try:
        if ruta_fisica.is_file():
            os.remove(ruta_fisica)
    except OSError:
        # El registro ya se borró; un huérfano en disco es recuperable.
        pass

    return None
