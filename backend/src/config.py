"""
config.py
=========
Carga y validación de variables de entorno con Pydantic Settings.

Lee el archivo .env ubicado en la raíz de 'backend/' y expone un objeto
'settings' tipado y validado que el resto de la aplicación importa.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno de la aplicación (ver doc 06).

    Pydantic valida tipos automáticamente: si falta una variable obligatoria
    o tiene un tipo incorrecto, la app falla al arrancar con un error claro.
    """

    # --- Base de datos ---
    DATABASE_URL: str

    # --- Seguridad / JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # --- Almacenamiento ---
    STORAGE_TYPE: str = "LOCAL"
    # Carpeta base para el almacenamiento local de archivos (relativa a backend/).
    STORAGE_PATH: str = "storage"
    # Tamaño máximo permitido por archivo subido, en megabytes.
    MAX_UPLOAD_MB: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignora variables del .env no declaradas aquí.
    )


@lru_cache
def get_settings() -> Settings:
    """Devuelve una instancia cacheada de Settings (singleton).

    Usar @lru_cache evita releer el .env en cada import y permite
    sobrescribir settings fácilmente en tests.
    """
    return Settings()


# Instancia global de conveniencia para imports directos.
settings = get_settings()
