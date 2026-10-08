"""
security.py
===========
Lógica pura de seguridad: hashing de contraseñas y manejo de tokens JWT.

Este módulo NO depende de FastAPI ni de la base de datos. Solo transforma
datos (contraseñas <-> hashes, payloads <-> tokens), lo que lo hace fácil
de probar de forma aislada y reutilizable desde cualquier parte de la app.

Decisión de diseño: se usa la librería 'bcrypt' de forma nativa (sin passlib)
para evitar el conflicto conocido entre passlib y bcrypt >= 4.1, dejando el
proyecto a prueba de futuro.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from src.config import settings


# ---------------------------------------------------------------------------
# Hashing de contraseñas con bcrypt nativo
# ---------------------------------------------------------------------------
# bcrypt trabaja con bytes y tiene un límite de 72 bytes en la contraseña.
# Codificamos a UTF-8 al entrar y decodificamos el hash a str para guardarlo
# cómodamente en la columna 'password_hash' (String) de la tabla User.
def hash_password(plain_password: str) -> str:
    """Genera el hash seguro (bcrypt) de una contraseña en texto plano.

    El 'salt' se genera automáticamente y queda embebido dentro del propio
    hash resultante, por lo que no hace falta almacenarlo por separado.
    """
    password_bytes = plain_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que una contraseña en texto plano coincida con su hash.

    Devuelve False (en lugar de lanzar) si el hash almacenado está mal
    formado, para no filtrar detalles internos ante entradas corruptas.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Generación y validación de JWT (python-jose)
# ---------------------------------------------------------------------------
def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Crea un JWT de acceso firmado.

    Args:
        data: Claims a incluir en el token. Debe contener al menos 'sub'
              (el identificador del usuario, normalmente su id en texto).
        expires_delta: Duración opcional. Si no se pasa, usa el valor del .env.

    Returns:
        El token JWT codificado como string.
    """
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Decodifica y valida un JWT.

    Returns:
        El payload (claims) si el token es válido y no ha expirado.
        None si el token es inválido, está manipulado o expiró.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None
