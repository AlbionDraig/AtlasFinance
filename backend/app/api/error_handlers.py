"""Helpers para traducir errores de dominio (ValueError) a HTTPException.

Los servicios lanzan ValueError para mantenerse desacoplados de FastAPI.
Estos helpers viven en la capa API y unifican la traducción a códigos HTTP
así cada route no replica try/except con la misma lógica.
"""
from collections.abc import Collection
from typing import NoReturn

from fastapi import HTTPException, status


def raise_bad_request_from_value_error(exc: ValueError) -> NoReturn:
    """Traduce un ValueError de dominio en HTTP 400 (Bad Request).

    Se usa cuando todo error del servicio implica datos inválidos del cliente
    (e.g. email duplicado, contraseña actual incorrecta).
    `from exc` preserva la traza original para logs/debugging.
    """
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


def raise_domain_value_error(
    exc: ValueError,
    *,
    not_found_messages: Collection[str] | None = None,
) -> NoReturn:
    """Traduce ValueError a 400 ó 404 según el mensaje.

    Algunos servicios usan ValueError tanto para validación como para
    "recurso inexistente". El caller pasa la lista de mensajes que deben
    convertirse en 404; el resto cae en 400 por defecto.
    """
    detail = str(exc)
    # Comparamos el mensaje exacto: es frágil pero suficiente porque los servicios
    # usan strings cortas y constantes para los casos "not found".
    if not_found_messages and detail in not_found_messages:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc


def raise_not_found_from_value_error(exc: ValueError) -> NoReturn:
    """Traduce un ValueError de dominio en HTTP 404 (Not Found)."""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
