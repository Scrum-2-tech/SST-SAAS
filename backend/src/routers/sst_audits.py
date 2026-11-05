"""
routers/sst_audits.py
======================
Endpoints del módulo de AUDITORÍAS INTERNAS del SG-SST (negocio de SST).

No confundir con /audit-logs (trazabilidad técnica). Aquí se gestionan las
auditorías que exige el Decreto 1072 de 2015 y la Resolución 0312 de 2019,
con sus hallazgos y planes de acción.

Blindaje multi-tenant y permisos:
    - Todo depende de get_current_tenant (header X-Company-Id).
    - company_id SIEMPRE proviene del tenant resuelto, nunca del body.
    - Solo GESTOR y SUPERADMIN gestionan auditorías; VISTA_AUDITORIA es solo
      lectura de métricas y NO accede a este módulo (-> 403).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_tenant, get_current_user
from src.models import (
    AuditLog,
    Company,
    Folder,
    SstAudit,
    SstAuditChecklistItem,
    SstFinding,
    User,
    UserRole,
)
from src.schemas import (
    SstAuditChecklistUpdate,
    SstAuditChecklistItemOut,
    SstAuditCreate,
    SstAuditDetailOut,
    SstAuditOut,
    SstAuditUpdate,
    SstFindingCreate,
    SstFindingOut,
    SstFindingUpdate,
)

router = APIRouter(prefix="/sst-audits", tags=["Auditorías SST"])


def _guard_gestion(current_user: User) -> None:
    """Bloquea el acceso de Vista_Auditoria al módulo de gestión."""
    if current_user.role == UserRole.VISTA_AUDITORIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permiso para acceder a las auditorías del SG-SST.",
        )


def _get_audit_or_404(
    audit_id: uuid.UUID, tenant: Company, db: Session
) -> SstAudit:
    """Recupera una auditoría validando que pertenezca al tenant activo."""
    audit = db.get(SstAudit, audit_id)
    if audit is None or audit.company_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La auditoría no existe en este portafolio.",
        )
    return audit


def _validate_folder(folder_id: uuid.UUID | None, tenant: Company, db: Session) -> None:
    if folder_id is None:
        return
    folder = db.get(Folder, folder_id)
    if folder is None or folder.company_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carpeta asociada no existe en este portafolio.",
        )


# ---------------------------------------------------------------------------
# Auditorías
# ---------------------------------------------------------------------------
@router.get(
    "/summary",
    summary="Resumen estadístico de auditorías para el dashboard",
)
def resumen_auditorias(
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard_gestion(current_user)
    today = date.today()
    audits = list(
        db.scalars(
            select(SstAudit)
            .where(SstAudit.company_id == tenant.id)
            .order_by(SstAudit.scheduled_date.asc())
        ).all()
    )
    upcoming = [
        audit
        for audit in audits
        if audit.status.value != "Cerrada"
        and audit.scheduled_date is not None
        and today <= audit.scheduled_date <= today + timedelta(days=30)
    ]
    overdue = [
        audit
        for audit in audits
        if audit.status.value != "Cerrada"
        and audit.scheduled_date is not None
        and audit.scheduled_date < today
    ]
    return {
        "total": len(audits),
        "closed": sum(audit.status.value == "Cerrada" for audit in audits),
        "upcoming": [
            {"id": audit.id, "title": audit.title, "date": audit.scheduled_date}
            for audit in upcoming[:8]
        ],
        "overdue": [
            {"id": audit.id, "title": audit.title, "date": audit.scheduled_date}
            for audit in overdue[:8]
        ],
    }


@router.get("", response_model=list[SstAuditOut], summary="Listar auditorías SST")
def listar_auditorias(
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SstAudit]:
    _guard_gestion(current_user)
    registros = db.scalars(
        select(SstAudit)
        .where(SstAudit.company_id == tenant.id)
        .order_by(SstAudit.created_at.desc())
    ).all()
    return list(registros)


@router.get(
    "/{audit_id}",
    response_model=SstAuditDetailOut,
    summary="Detalle de una auditoría con sus hallazgos",
)
def obtener_auditoria(
    audit_id: uuid.UUID,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SstAudit:
    _guard_gestion(current_user)
    return _get_audit_or_404(audit_id, tenant, db)


@router.post(
    "",
    response_model=SstAuditOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una auditoría SST",
)
def crear_auditoria(
    payload: SstAuditCreate,
    request: Request,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SstAudit:
    _guard_gestion(current_user)
    _validate_folder(payload.folder_id, tenant, db)
    nueva = SstAudit(
        company_id=tenant.id,  # <-- SIEMPRE del tenant resuelto.
        title=payload.title,
        scope=payload.scope,
        auditor=payload.auditor,
        scheduled_date=payload.scheduled_date,
        folder_id=payload.folder_id,
        follow_up_date=payload.follow_up_date,
        observations=payload.observations,
        observations_updated_at=(
            datetime.now(timezone.utc) if payload.observations else None
        ),
        observations_updated_by_id=current_user.id if payload.observations else None,
        status=payload.status,
    )
    db.add(nueva)
    db.flush()
    for position, item in enumerate(payload.checklist_items):
        db.add(
            SstAuditChecklistItem(
                audit_id=nueva.id,
                label=item.label,
                completed=item.completed,
                position=position,
            )
        )
    if payload.observations:
        db.add(
            AuditLog(
                user_id=current_user.id,
                company_id=tenant.id,
                action="CREAR_SALVEDAD",
                details=(
                    f"Salvedad registrada en auditoría '{nueva.title}': "
                    f"{payload.observations}"
                ),
                ip_address=request.client.host if request.client else None,
            )
        )
    db.commit()
    db.refresh(nueva)
    return nueva


@router.patch(
    "/{audit_id}",
    response_model=SstAuditOut,
    summary="Actualizar una auditoría SST",
)
def actualizar_auditoria(
    audit_id: uuid.UUID,
    payload: SstAuditUpdate,
    request: Request,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SstAudit:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    datos = payload.model_dump(exclude_unset=True)
    _validate_folder(datos.get("folder_id"), tenant, db)
    actualizo_salvedad = "observations" in datos
    for campo, valor in datos.items():
        setattr(audit, campo, valor)
    if actualizo_salvedad:
        audit.observations_updated_at = datetime.now(timezone.utc)
        audit.observations_updated_by_id = current_user.id
        db.add(
            AuditLog(
                user_id=current_user.id,
                company_id=tenant.id,
                action="ACTUALIZAR_SALVEDAD",
                details=(
                    f"Salvedad actualizada en auditoría '{audit.title}': "
                    f"{datos['observations'] or '(sin texto)'}"
                ),
                ip_address=request.client.host if request.client else None,
            )
        )
    db.commit()
    db.refresh(audit)
    return audit


@router.put(
    "/{audit_id}/checklist",
    response_model=list[SstAuditChecklistItemOut],
    summary="Guardar el checklist de una auditoría",
)
def actualizar_checklist(
    audit_id: uuid.UUID,
    payload: SstAuditChecklistUpdate,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SstAuditChecklistItem]:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    db.query(SstAuditChecklistItem).filter(
        SstAuditChecklistItem.audit_id == audit.id
    ).delete(synchronize_session=False)
    items = [
        SstAuditChecklistItem(
            audit_id=audit.id,
            label=item.label,
            completed=item.completed,
            position=position,
        )
        for position, item in enumerate(payload.items)
    ]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)
    return items


@router.delete(
    "/{audit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una auditoría SST y sus hallazgos",
)
def eliminar_auditoria(
    audit_id: uuid.UUID,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    db.delete(audit)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Hallazgos (anidados bajo una auditoría)
# ---------------------------------------------------------------------------
@router.post(
    "/{audit_id}/findings",
    response_model=SstFindingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar un hallazgo a una auditoría",
)
def crear_hallazgo(
    audit_id: uuid.UUID,
    payload: SstFindingCreate,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SstFinding:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    hallazgo = SstFinding(
        audit_id=audit.id,
        description=payload.description,
        finding_type=payload.finding_type,
        action_plan=payload.action_plan,
        responsible=payload.responsible,
        due_date=payload.due_date,
        status=payload.status,
    )
    db.add(hallazgo)
    db.commit()
    db.refresh(hallazgo)
    return hallazgo


@router.patch(
    "/{audit_id}/findings/{finding_id}",
    response_model=SstFindingOut,
    summary="Actualizar un hallazgo",
)
def actualizar_hallazgo(
    audit_id: uuid.UUID,
    finding_id: uuid.UUID,
    payload: SstFindingUpdate,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SstFinding:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    hallazgo = db.get(SstFinding, finding_id)
    if hallazgo is None or hallazgo.audit_id != audit.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El hallazgo no existe en esta auditoría.",
        )
    datos = payload.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        setattr(hallazgo, campo, valor)
    db.commit()
    db.refresh(hallazgo)
    return hallazgo


@router.delete(
    "/{audit_id}/findings/{finding_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un hallazgo",
)
def eliminar_hallazgo(
    audit_id: uuid.UUID,
    finding_id: uuid.UUID,
    tenant: Company = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _guard_gestion(current_user)
    audit = _get_audit_or_404(audit_id, tenant, db)
    hallazgo = db.get(SstFinding, finding_id)
    if hallazgo is None or hallazgo.audit_id != audit.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El hallazgo no existe en esta auditoría.",
        )
    db.delete(hallazgo)
    db.commit()
    return None
