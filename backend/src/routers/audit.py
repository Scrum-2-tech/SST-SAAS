"""
routers/audit.py
================
Endpoint de consulta del historial de trazabilidad (AuditLog).

- GET /audit-logs : lista los registros de auditoría de la empresa activa,
  ordenados del más reciente al más antiguo.

Blindaje multi-tenant y permisos:
    - Depende de get_current_tenant (header X-Company-Id).
    - Filtra estrictamente por tenant.id: nunca muestra logs de otra empresa.
    - Solo GESTOR y SUPERADMIN pueden consultar el historial; Vista_Auditoria
      no accede a la trazabilidad interna (-> 403).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_tenant, get_current_user
from src.models import AuditLog, Company, User, UserRole
from src.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["Auditoría"])


@router.get(
    "",
    response_model=list[AuditLogOut],
    summary="Consultar el historial de auditoría de la empresa activa",
)
def listar_auditoria(
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditLog]:
    """Devuelve el historial de acciones del tenant activo (recientes primero).

    El filtro por tenant.id garantiza el aislamiento: un Gestor solo ve la
    trazabilidad de la empresa que tiene seleccionada en el header.
    """
    # Permisos: la trazabilidad es para gestión, no para el cliente de auditoría.
    if current_user.role == UserRole.VISTA_AUDITORIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para consultar el historial de auditoría.",
        )

    registros = db.scalars(
        select(AuditLog)
        .where(AuditLog.company_id == tenant.id)
        .order_by(AuditLog.timestamp.desc())  # más reciente primero.
    ).all()
    return list(registros)
