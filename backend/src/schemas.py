"""
schemas.py
==========
Esquemas de Pydantic v2 para validación de entrada/salida de la API.

Convenciones:
    - *Create / *Register / *Login : datos que ENTRAN (request body).
    - *Out : datos que SALEN (response). Nunca exponen password_hash.
    - from_attributes=True permite construir los *Out directamente desde
      instancias de los modelos ORM de SQLAlchemy.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models import (
    FileStatus,
    FindingStatus,
    FindingType,
    SstAuditStatus,
    UserRole,
)


# ---------------------------------------------------------------------------
# Empresas (Company)
# ---------------------------------------------------------------------------
class CompanyCreate(BaseModel):
    """Datos para crear una empresa (POST /companies)."""

    name: str = Field(..., min_length=1, max_length=255)
    nit: str = Field(..., min_length=1, max_length=50)


class CompanyOut(BaseModel):
    """Representación pública de una empresa."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    nit: str
    owner_id: Optional[uuid.UUID]
    created_at: datetime


# ---------------------------------------------------------------------------
# Usuarios (User)
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    """Datos para el registro público (POST /auth/register).

    Nota de seguridad: aunque el cliente envíe 'role', el endpoint lo IGNORA
    y fuerza siempre role=GESTOR (self-signup). El campo se deja opcional por
    compatibilidad, pero no se confía en él.
    """

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    # Se aceptan pero NO se usan en el registro público (ver router).
    role: Optional[UserRole] = None
    company_id: Optional[uuid.UUID] = None


class UserOut(BaseModel):
    """Representación pública de un usuario. NUNCA incluye password_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    role: UserRole
    company_id: Optional[uuid.UUID]
    created_at: datetime


# ---------------------------------------------------------------------------
# Autenticación / Tokens
# ---------------------------------------------------------------------------
class Token(BaseModel):
    """Respuesta del login con el JWT de acceso."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Payload decodificado de un JWT (uso interno/validación)."""

    user_id: Optional[uuid.UUID] = None


# ---------------------------------------------------------------------------
# Carpetas (Folder)
# ---------------------------------------------------------------------------
class FolderCreate(BaseModel):
    """Datos para crear una carpeta (POST /folders).

    - parent_id = None  -> carpeta raíz.
    - parent_id = <uuid> -> subcarpeta (debe pertenecer al tenant activo).
    """

    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[uuid.UUID] = None


class FolderOut(BaseModel):
    """Representación simple de una carpeta (nodo sin hijos)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    parent_id: Optional[uuid.UUID]
    company_id: uuid.UUID
    created_at: datetime


class FolderTreeOut(FolderOut):
    """Nodo recursivo del árbol de carpetas.

    'children' contiene las subcarpetas anidadas, permitiendo a Angular
    dibujar el árbol completo directamente.
    """

    children: list["FolderTreeOut"] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Archivos (File)
# ---------------------------------------------------------------------------
class FileOut(BaseModel):
    """Representación pública de un archivo, incluyendo metadatos SST.

    'status' es la propiedad calculada dinámicamente en el modelo (Fase 1):
    Vigente / Por Vencer / Vencido / Sin Vencimiento.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    file_url: str
    folder_id: Optional[uuid.UUID]
    company_id: uuid.UUID
    is_critical: bool
    expiration_date: Optional[date]
    status: FileStatus
    uploaded_at: datetime


# ---------------------------------------------------------------------------
# Auditoría (AuditLog)
# ---------------------------------------------------------------------------
class AuditLogOut(BaseModel):
    """Representación pública de un registro de auditoría (historial)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    company_id: uuid.UUID
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime


# ---------------------------------------------------------------------------
# Auditorías internas del SG-SST (negocio de SST)
# ---------------------------------------------------------------------------
class SstFindingCreate(BaseModel):
    """Datos para registrar un hallazgo dentro de una auditoría."""

    description: str = Field(..., min_length=1)
    finding_type: FindingType = FindingType.OBSERVACION
    action_plan: Optional[str] = None
    responsible: Optional[str] = Field(default=None, max_length=255)
    due_date: Optional[date] = None
    status: FindingStatus = FindingStatus.ABIERTO


class SstFindingUpdate(BaseModel):
    """Campos editables de un hallazgo (todos opcionales)."""

    description: Optional[str] = Field(default=None, min_length=1)
    finding_type: Optional[FindingType] = None
    action_plan: Optional[str] = None
    responsible: Optional[str] = Field(default=None, max_length=255)
    due_date: Optional[date] = None
    status: Optional[FindingStatus] = None


class SstFindingOut(BaseModel):
    """Representación pública de un hallazgo."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audit_id: uuid.UUID
    description: str
    finding_type: FindingType
    action_plan: Optional[str]
    responsible: Optional[str]
    due_date: Optional[date]
    status: FindingStatus
    created_at: datetime


class SstAuditCreate(BaseModel):
    """Datos para crear una auditoría interna del SG-SST."""

    title: str = Field(..., min_length=1, max_length=255)
    scope: Optional[str] = None
    auditor: Optional[str] = Field(default=None, max_length=255)
    scheduled_date: Optional[date] = None
    status: SstAuditStatus = SstAuditStatus.PLANIFICADA


class SstAuditUpdate(BaseModel):
    """Campos editables de una auditoría (todos opcionales)."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    scope: Optional[str] = None
    auditor: Optional[str] = Field(default=None, max_length=255)
    scheduled_date: Optional[date] = None
    status: Optional[SstAuditStatus] = None


class SstAuditOut(BaseModel):
    """Representación de una auditoría SIN sus hallazgos (para listados)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    title: str
    scope: Optional[str]
    auditor: Optional[str]
    scheduled_date: Optional[date]
    status: SstAuditStatus
    created_at: datetime


class SstAuditDetailOut(SstAuditOut):
    """Auditoría con la lista completa de sus hallazgos (para el detalle)."""

    findings: list[SstFindingOut] = Field(default_factory=list)
