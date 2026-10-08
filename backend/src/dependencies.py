"""
dependencies.py
===============
Dependencias de seguridad de FastAPI para autenticación y multi-tenancy.

Flujo de seguridad en dos capas:
    1. get_current_user  -> valida el JWT y recupera el usuario de la BD.
    2. get_current_tenant -> valida que ese usuario pueda operar sobre la
       empresa (company_id) solicitada, aplicando las reglas por rol.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Company, User, UserRole
from src.security import decode_access_token

# Esquema OAuth2: FastAPI extraerá el token del header
# 'Authorization: Bearer <token>'. tokenUrl apunta al endpoint de login
# (se creará en routers/auth.py en la parte B de la Fase 2).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ---------------------------------------------------------------------------
# Capa 1: Autenticación — ¿quién eres?
# ---------------------------------------------------------------------------
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Valida el JWT y devuelve el usuario autenticado.

    Lanza HTTP 401 si el token es inválido, expiró, o el usuario ya no existe.
    """
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credenciales_invalidas

    user_id_raw: Optional[str] = payload.get("sub")
    if user_id_raw is None:
        raise credenciales_invalidas

    # El 'sub' viaja como string; lo convertimos de vuelta a UUID.
    try:
        user_id = uuid.UUID(user_id_raw)
    except (ValueError, TypeError):
        raise credenciales_invalidas

    user = db.get(User, user_id)
    if user is None:
        raise credenciales_invalidas

    return user


# ---------------------------------------------------------------------------
# Capa 2: Autorización multi-tenant — ¿puedes tocar ESTA empresa?
# ---------------------------------------------------------------------------
def get_current_tenant(
    x_company_id: Optional[uuid.UUID] = Header(default=None, alias="X-Company-Id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Company:
    """Resuelve y valida la empresa (tenant) sobre la que opera la petición.

    Reglas por rol (ver docs 01 y 06):
        - SUPERADMIN: control global. Puede operar sobre cualquier empresa,
          pero debe indicar cuál mediante el header 'X-Company-Id'.
        - GESTOR / VISTA_AUDITORIA: solo pueden operar sobre SU propia empresa
          (la de su company_id). Si piden otra -> HTTP 403 Forbidden.

    El frontend (Angular) envía el header 'X-Company-Id' con la empresa
    seleccionada en el dashboard, tal como describe el doc 02.
    """
    # --- Caso SuperAdmin: acceso global, pero debe especificar la empresa ---
    if current_user.role == UserRole.SUPERADMIN:
        if x_company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El SuperAdmin debe indicar la empresa mediante el header 'X-Company-Id'.",
            )
        company = db.get(Company, x_company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La empresa indicada no existe.",
            )
        return company

    # --- Caso Gestor: el tenant proviene del header X-Company-Id ---
    # El Gestor NO pertenece a una empresa (company_id = NULL); es DUEÑO de
    # varias (Company.owner_id). Por eso el tenant se resuelve desde el header
    # y se valida que la empresa seleccionada le pertenezca.
    if current_user.role == UserRole.GESTOR:
        if x_company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe seleccionar una empresa mediante el header 'X-Company-Id'.",
            )
        company = db.get(Company, x_company_id)
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La empresa indicada no existe.",
            )
        # El Gestor solo puede operar sobre empresas de su propio portafolio.
        if company.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permiso para acceder a los datos de esta empresa.",
            )
        return company

    # --- Caso Vista de Auditoría: encerrado en su única empresa asignada ---
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene una empresa asignada.",
        )

    # Si el cliente envía un X-Company-Id distinto al suyo -> intento de fuga de datos.
    if x_company_id is not None and x_company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para acceder a los datos de esta empresa.",
        )

    company = db.get(Company, current_user.company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La empresa asociada al usuario no existe.",
        )

    return company


# ---------------------------------------------------------------------------
# Dependencia auxiliar: exigir rol SuperAdmin
# ---------------------------------------------------------------------------
def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Restringe un endpoint exclusivamente al SuperAdmin."""
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de SuperAdmin.",
        )
    return current_user
