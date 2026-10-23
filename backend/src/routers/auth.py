"""
routers/auth.py
===============
Endpoints de autenticación: registro público y login (OAuth2).

- POST /auth/register : self-signup. Fuerza siempre role=GESTOR.
- POST /auth/login    : login con form-data (OAuth2PasswordRequestForm),
                        devuelve un JWT con el user_id en el claim 'sub'.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.models import User, UserRole
from src.schemas import Token, UserOut, UserRegister
from src.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.get(
    "/me",
    response_model=UserOut,
    summary="Devuelve el usuario autenticado (identidad y rol)",
)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Devuelve los datos del usuario del token actual.

    El frontend lo usa para conocer el ROL del usuario y decidir qué
    secciones mostrar (ej. la Trazabilidad solo es visible para Gestor y
    SuperAdmin). No expone nunca el password_hash (ver UserOut).
    """
    return current_user


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registro público de Gestores SST",
)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    """Registra un nuevo Gestor SST (self-signup).

    Seguridad: el rol se FUERZA a GESTOR ignorando lo que venga en el body,
    para que nadie pueda auto-asignarse SuperAdmin. El company_id queda NULL
    (el Gestor no pertenece a una empresa; será dueño de varias).
    """
    # ¿Email ya registrado?
    existe = db.scalar(select(User).where(User.email == payload.email))
    if existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado.",
        )

    nuevo_usuario = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.GESTOR,   # <-- rol forzado por seguridad.
        company_id=None,        # <-- el Gestor no pertenece a una empresa.
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post(
    "/login",
    response_model=Token,
    summary="Inicio de sesión (OAuth2) y emisión de JWT",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """Autentica al usuario y devuelve un JWT.

    OAuth2PasswordRequestForm recibe los campos 'username' y 'password' como
    form-data. Usamos el campo 'username' para el email del usuario.
    """
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Correo o contraseña incorrectos.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise credenciales_invalidas

    # El 'sub' lleva el user_id como string (lo exige la especificación JWT).
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)
