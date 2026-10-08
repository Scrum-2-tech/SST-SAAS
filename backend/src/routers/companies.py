"""
routers/companies.py
====================
Endpoints de gestión de empresas (portafolio del Gestor SST).

- POST /companies : crea una empresa y la amarra al Gestor logueado como
                    'owner'. El SuperAdmin también puede crear.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.models import Company, User, UserRole
from src.schemas import CompanyCreate, CompanyOut

router = APIRouter(prefix="/companies", tags=["Empresas"])


@router.get(
    "",
    response_model=list[CompanyOut],
    summary="Listar las empresas visibles para el usuario",
)
def listar_empresas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Company]:
    """Lista las empresas según el rol del usuario autenticado.

    Reglas de visibilidad (portafolio para el menú de Angular):
        - SUPERADMIN: ve TODAS las empresas del sistema (control global).
        - GESTOR: ve solo las empresas que le pertenecen (owner_id == su id).
        - VISTA_AUDITORIA: ve únicamente la empresa de su company_id.
    """
    # SuperAdmin: control global sobre todas las empresas.
    if current_user.role == UserRole.SUPERADMIN:
        return list(db.scalars(select(Company)).all())

    # Gestor: solo su propio portafolio (empresas de las que es dueño).
    if current_user.role == UserRole.GESTOR:
        return list(
            db.scalars(
                select(Company).where(Company.owner_id == current_user.id)
            ).all()
        )

    # Vista_Auditoria: solo su única empresa asignada (si la tiene).
    if current_user.company_id is None:
        return []
    empresa = db.get(Company, current_user.company_id)
    return [empresa] if empresa is not None else []


@router.post(
    "",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una empresa en el portafolio",
)
def crear_empresa(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Company:
    """Crea una nueva empresa cliente.

    Autorización: solo GESTOR y SUPERADMIN pueden crear empresas.
    Un usuario Vista_Auditoria no tiene permiso (-> 403).

    La empresa se amarra automáticamente al usuario logueado mediante
    'owner_id', de modo que un Gestor queda como dueño de su portafolio.
    """
    if current_user.role not in (UserRole.GESTOR, UserRole.SUPERADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para crear empresas.",
        )

    # NIT único a nivel de sistema (ver modelo: columna nit unique).
    existe = db.scalar(select(Company).where(Company.nit == payload.nit))
    if existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una empresa registrada con ese NIT.",
        )

    nueva_empresa = Company(
        name=payload.name,
        nit=payload.nit,
        owner_id=current_user.id,  # <-- amarre automático al Gestor logueado.
    )
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    return nueva_empresa
