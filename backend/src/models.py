"""
models.py
=========
Modelos de base de datos (SQLAlchemy 2.0) para el SaaS Multi-tenant de SST.

Define las entidades centrales del sistema:
    - Company (empresas cliente del Gestor SST)
    - User (usuarios de la plataforma, con roles)
    - Folder (carpetas con subcarpetas infinitas vía auto-referencia)
    - File (archivos con metadatos de vencimiento SST)
    - AuditLog (trazabilidad de acciones para auditoría)

Principios de diseño aplicados:
    - UUID como llave primaria en todas las tablas.
    - Aislamiento multi-tenant: columna 'company_id' obligatoria en las tablas
      que contienen datos de clientes (folders, files, audit_logs).
    - Estilo moderno SQLAlchemy 2.0: DeclarativeBase, Mapped y mapped_column.
    - 'status' de los archivos se calcula dinámicamente (no se persiste) para
      evitar datos obsoletos.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


# ---------------------------------------------------------------------------
# Enumeraciones del dominio
# ---------------------------------------------------------------------------
class UserRole(str, enum.Enum):
    """Roles de operación del sistema (ver doc 01).

    - SUPERADMIN: Dueño del software. Controla accesos y espacio del servidor.
    - GESTOR: Gestor SST / Profesional independiente. Cliente principal.
    - VISTA_AUDITORIA: Acceso de solo lectura para la empresa asesorada.
    """

    SUPERADMIN = "SuperAdmin"
    GESTOR = "Gestor"
    VISTA_AUDITORIA = "Vista_Auditoria"


class FileStatus(str, enum.Enum):
    """Estado de vigencia de un archivo, calculado según su fecha de vencimiento."""

    VIGENTE = "Vigente"
    POR_VENCER = "Por Vencer"  # Dentro de los últimos 30 días antes de vencer.
    VENCIDO = "Vencido"
    SIN_VENCIMIENTO = "Sin Vencimiento"  # Archivos sin expiration_date definido.


# Umbral (en días) a partir del cual un documento se considera "Por Vencer".
DIAS_ALERTA_VENCIMIENTO = 30


# ---------------------------------------------------------------------------
# Entidad: Company (Empresa cliente)
# ---------------------------------------------------------------------------
class Company(Base):
    """Empresa asesorada que forma parte del portafolio de un Gestor SST.

    Es la raíz del aislamiento multi-tenant: los folders, files y logs
    siempre pertenecen a una Company concreta.

    'owner_id' apunta al Gestor (User) dueño de esta empresa. Un Gestor puede
    ser dueño de MÚLTIPLES empresas (relación 1 Gestor : N Companies), lo que
    resuelve el requisito del doc 01 ("el Gestor maneja múltiples empresas").
    """

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    nit: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Gestor dueño del portafolio. Nullable + SET NULL: si se borra el Gestor,
    # las empresas sobreviven huérfanas (los datos SST son obligatorios por ley)
    # para que el SuperAdmin pueda reasignarlas a otro prevencionista.
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relaciones ---
    # El Gestor dueño de esta empresa. Usa la FK Company.owner_id.
    owner: Mapped[Optional["User"]] = relationship(
        back_populates="owned_companies",
        foreign_keys=[owner_id],
    )

    # Usuarios Vista_Auditoria que pertenecen a esta empresa (User.company_id).
    # Se desambigua con foreign_keys porque ahora hay dos FKs User<->Company.
    users: Mapped[list["User"]] = relationship(
        back_populates="company",
        foreign_keys="User.company_id",
        cascade="all, delete-orphan",
    )
    folders: Mapped[list["Folder"]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
    )
    files: Mapped[list["File"]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Company id={self.id} name={self.name!r} nit={self.nit!r}>"


# ---------------------------------------------------------------------------
# Entidad: User (Usuario)
# ---------------------------------------------------------------------------
class User(Base):
    """Usuario de la plataforma.

    Significado de 'company_id' según rol:
        - SUPERADMIN: NULL (no pertenece a ninguna empresa).
        - GESTOR: NULL. El Gestor no "pertenece" a una empresa; es DUEÑO de
          varias a través de Company.owner_id (ver 'owned_companies').
        - VISTA_AUDITORIA: apunta a la única empresa que ese cliente puede ver.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role_enum"),
        nullable=False,
        default=UserRole.GESTOR,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relaciones ---
    # Empresa a la que pertenece el usuario (solo aplica a Vista_Auditoria).
    # Se desambigua con foreign_keys por las dos FKs User<->Company.
    company: Mapped[Optional["Company"]] = relationship(
        back_populates="users",
        foreign_keys="User.company_id",
    )

    # Empresas de las que este usuario (Gestor) es dueño. Usa Company.owner_id.
    owned_companies: Mapped[list["Company"]] = relationship(
        back_populates="owner",
        foreign_keys="Company.owner_id",
    )

    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role.value}>"


# ---------------------------------------------------------------------------
# Entidad: Folder (Carpeta con subcarpetas infinitas)
# ---------------------------------------------------------------------------
class Folder(Base):
    """Carpeta del portafolio documental.

    Jerarquía recursiva (Adjacency List): 'parent_id' apunta a otra Folder.
    - Si parent_id es NULL -> es una carpeta raíz (ej. Matriz de Riesgos).
    - Si parent_id tiene valor -> es una subcarpeta (profundidad ilimitada).
    """

    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relaciones.
    company: Mapped["Company"] = relationship(back_populates="folders")

    # Auto-referencia para la jerarquía infinita.
    parent: Mapped[Optional["Folder"]] = relationship(
        back_populates="children",
        remote_side=[id],
    )
    children: Mapped[list["Folder"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
    )

    # Archivos contenidos directamente en esta carpeta.
    files: Mapped[list["File"]] = relationship(
        back_populates="folder",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Folder id={self.id} name={self.name!r} parent_id={self.parent_id}>"


# ---------------------------------------------------------------------------
# Entidad: File (Archivo con metadatos de vencimiento SST)
# ---------------------------------------------------------------------------
class File(Base):
    """Archivo almacenado en el portafolio documental.

    Incluye los metadatos de SST (doc 06):
    - is_critical: documento obligatorio por ley.
    - expiration_date: fecha de vencimiento del documento.
    - status: propiedad calculada dinámicamente (NO se persiste en BD).
    """

    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    folder_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    # --- Metadatos de SST ---
    is_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relaciones.
    company: Mapped["Company"] = relationship(back_populates="files")
    folder: Mapped[Optional["Folder"]] = relationship(back_populates="files")

    @property
    def status(self) -> FileStatus:
        """Calcula el estado de vigencia del archivo en tiempo real.

        Reglas (doc 06):
            - Sin expiration_date  -> SIN_VENCIMIENTO
            - Fecha ya pasó        -> VENCIDO
            - Vence en <= 30 días  -> POR_VENCER
            - En otro caso         -> VIGENTE
        """
        if self.expiration_date is None:
            return FileStatus.SIN_VENCIMIENTO

        hoy = date.today()
        dias_restantes = (self.expiration_date - hoy).days

        if dias_restantes < 0:
            return FileStatus.VENCIDO
        if dias_restantes <= DIAS_ALERTA_VENCIMIENTO:
            return FileStatus.POR_VENCER
        return FileStatus.VIGENTE

    def __repr__(self) -> str:
        return f"<File id={self.id} name={self.name!r} status={self.status.value}>"


# ---------------------------------------------------------------------------
# Entidad: AuditLog (Trazabilidad de acciones)
# ---------------------------------------------------------------------------
class AuditLog(Base):
    """Registro de auditoría de acciones sensibles (doc 01).

    Guarda quién hizo qué, sobre qué empresa, desde qué IP y cuándo.
    No se usa cascade de borrado hacia User para preservar el historial
    aunque el usuario sea eliminado (SET NULL).
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # ej: SUBIR, ELIMINAR, DESCARGAR
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # soporta IPv6
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relaciones.
    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")
    company: Mapped["Company"] = relationship(back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r} user_id={self.user_id}>"
