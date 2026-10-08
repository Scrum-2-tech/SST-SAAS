"""
routers/folders.py
==================
Endpoints de gestión de carpetas (Adjacency List recursiva).

- POST /folders : crea una carpeta raíz (parent_id=NULL) o subcarpeta.
- GET  /folders : devuelve el árbol anidado completo de la empresa activa.

Blindaje multi-tenant (reglas críticas de los docs 06 y 02):
    - Toda operación depende de get_current_tenant (lee el header X-Company-Id).
    - El company_id escrito/filtrado SIEMPRE proviene de tenant.id, nunca del
      body ni de la URL.
    - Cualquier parent_id recibido se re-valida contra el tenant para impedir
      colgar carpetas bajo el portafolio de otra empresa.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_tenant, get_current_user
from src.models import AuditLog, Company, File, Folder, User, UserRole
from src.schemas import FolderCreate, FolderOut, FolderTreeOut

router = APIRouter(prefix="/folders", tags=["Carpetas"])


@router.post(
    "",
    response_model=FolderOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una carpeta o subcarpeta",
)
def crear_carpeta(
    payload: FolderCreate,
    tenant: Company = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> Folder:
    """Crea una carpeta en el portafolio de la empresa activa.

    Si 'parent_id' viene informado, se valida que la carpeta padre exista y
    pertenezca al mismo tenant (aislamiento). El company_id se fuerza al del
    tenant resuelto.
    """
    # Si es subcarpeta, validar que el padre sea del tenant activo.
    if payload.parent_id is not None:
        padre = db.get(Folder, payload.parent_id)
        if padre is None or padre.company_id != tenant.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La carpeta padre no existe en este portafolio.",
            )

    nueva_carpeta = Folder(
        name=payload.name,
        parent_id=payload.parent_id,
        company_id=tenant.id,  # <-- company_id SIEMPRE del tenant resuelto.
    )
    db.add(nueva_carpeta)
    db.commit()
    db.refresh(nueva_carpeta)
    return nueva_carpeta


@router.get(
    "",
    response_model=list[FolderTreeOut],
    summary="Listar el árbol de carpetas de la empresa activa",
)
def listar_arbol_carpetas(
    tenant: Company = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> list[FolderTreeOut]:
    """Devuelve el árbol anidado de carpetas del tenant activo.

    Estrategia: se traen TODAS las carpetas de la empresa en una sola consulta
    y el árbol se arma en memoria (evita N consultas recursivas a la BD). Las
    carpetas raíz son las que tienen parent_id = NULL.
    """
    # Una sola consulta, filtrada estrictamente por el tenant activo.
    carpetas = db.scalars(
        select(Folder).where(Folder.company_id == tenant.id)
    ).all()

    # Índice de nodos y agrupación de hijos por parent_id.
    nodos: dict[uuid.UUID, FolderTreeOut] = {}
    hijos_por_padre: dict[uuid.UUID | None, list[Folder]] = {}

    for carpeta in carpetas:
        nodos[carpeta.id] = FolderTreeOut.model_validate(carpeta)
        hijos_por_padre.setdefault(carpeta.parent_id, []).append(carpeta)

    # Ensamblar el árbol conectando cada nodo con sus hijos.
    for carpeta in carpetas:
        nodo = nodos[carpeta.id]
        nodo.children = [
            nodos[hijo.id] for hijo in hijos_por_padre.get(carpeta.id, [])
        ]

    # Las raíces (parent_id = NULL) son el nivel superior del árbol.
    raices = [
        nodos[carpeta.id] for carpeta in hijos_por_padre.get(None, [])
    ]
    return raices



@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una carpeta y todo su contenido (cascada)",
)
def eliminar_carpeta(
    folder_id: uuid.UUID,
    request: Request,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Elimina una carpeta, sus subcarpetas y archivos (en cascada en BD).

    Puntos clave:
        - Aislamiento: la carpeta debe pertenecer al tenant activo (si no -> 404).
        - Permisos: Vista_Auditoria es solo lectura y NO puede borrar (-> 403).
        - Limpieza de disco: el cascade de SQLAlchemy borra los registros File
          en BD, pero NO los ficheros físicos. Por eso recolectamos las rutas
          de todos los archivos bajo la carpeta (recursivamente) ANTES de
          borrar, y los eliminamos del disco DESPUÉS del commit.
        - Trazabilidad: se registra AuditLog "ELIMINAR_CARPETA".
    """
    # --- Permisos: Vista_Auditoria no puede borrar ---
    if current_user.role == UserRole.VISTA_AUDITORIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para eliminar carpetas.",
        )

    # --- Aislamiento: la carpeta debe ser del tenant activo ---
    carpeta = db.get(Folder, folder_id)
    if carpeta is None or carpeta.company_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carpeta no existe en este portafolio.",
        )

    nombre_carpeta = carpeta.name

    # --- Recolectar rutas físicas de TODOS los archivos del subárbol ---
    # Recorrido en amplitud sobre los ids de carpeta descendientes.
    ids_subarbol: list[uuid.UUID] = [carpeta.id]
    pendientes: list[uuid.UUID] = [carpeta.id]
    while pendientes:
        actual = pendientes.pop()
        hijos = db.scalars(
            select(Folder.id).where(Folder.parent_id == actual)
        ).all()
        ids_subarbol.extend(hijos)
        pendientes.extend(hijos)

    rutas_fisicas = db.scalars(
        select(File.file_url).where(File.folder_id.in_(ids_subarbol))
    ).all()

    # --- Borrado en BD (cascada hacia subcarpetas y archivos) + auditoría ---
    db.delete(carpeta)
    cliente_ip = request.client.host if request.client else None
    db.add(
        AuditLog(
            user_id=current_user.id,
            company_id=tenant.id,
            action="ELIMINAR_CARPETA",
            details=f"Carpeta '{nombre_carpeta}' eliminada con todo su contenido.",
            ip_address=cliente_ip,
        )
    )
    db.commit()

    # --- Limpieza de disco (tras confirmar el borrado en BD) ---
    # Si un fichero ya no existe en disco, se ignora: no debe tumbar la operación.
    for ruta in rutas_fisicas:
        try:
            archivo_fisico = Path(ruta)
            if archivo_fisico.is_file():
                os.remove(archivo_fisico)
        except OSError:
            # El registro ya se borró; un huérfano en disco es recuperable.
            pass

    return None
