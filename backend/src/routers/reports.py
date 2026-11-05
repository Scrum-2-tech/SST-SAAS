"""Endpoints de solo lectura para los reportes visibles en el dashboard."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_tenant
from src.models import Company, File, FileStatus, Folder, SstAudit, SstAuditStatus

router = APIRouter(prefix="/reports", tags=["Reportes"])


@router.get("/summary", summary="Resumen estadístico del portafolio")
def resumen_portafolio(
    tenant: Company = Depends(get_current_tenant),
    db: Session = Depends(get_db),
) -> dict:
    """Entrega métricas sin exponer las pantallas de gestión a clientes."""
    files = list(
        db.scalars(select(File).where(File.company_id == tenant.id)).all()
    )
    counts = {status.value: 0 for status in FileStatus}
    for file in files:
        counts[file.status.value] += 1

    today = date.today()
    end_date = today + timedelta(days=30)
    expirations = sorted(
        (
            {
                "name": file.name,
                "expiration_date": file.expiration_date,
                "status": file.status.value,
            }
            for file in files
            if file.expiration_date is not None
            and file.expiration_date <= end_date
        ),
        key=lambda item: item["expiration_date"],
    )
    audits = list(
        db.scalars(select(SstAudit).where(SstAudit.company_id == tenant.id)).all()
    )
    open_audits = [
        audit for audit in audits if audit.status != SstAuditStatus.CERRADA
    ]
    return {
        "documents": {
            "total": len(files),
            "vigentes": counts[FileStatus.VIGENTE.value],
            "por_vencer": counts[FileStatus.POR_VENCER.value],
            "vencidos": counts[FileStatus.VENCIDO.value],
            "sin_vencimiento": counts[FileStatus.SIN_VENCIMIENTO.value],
            "criticos": sum(file.is_critical for file in files),
        },
        "folders": db.scalar(
            select(func.count(Folder.id)).where(Folder.company_id == tenant.id)
        )
        or 0,
        "audits": {
            "total": len(audits),
            "proximas": sum(
                audit.scheduled_date is not None
                and today <= audit.scheduled_date <= end_date
                for audit in open_audits
            ),
            "vencidas": sum(
                audit.scheduled_date is not None
                and audit.scheduled_date < today
                for audit in open_audits
            ),
        },
        "expirations": expirations[:8],
    }
