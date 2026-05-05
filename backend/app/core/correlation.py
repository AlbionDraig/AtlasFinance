"""Middleware ASGI que asigna un correlation ID por request.

Lee la cabecera ``X-Request-ID`` si llega del cliente / proxy; si no, genera
un UUID4. Lo expone en:

- ``request.state.correlation_id`` para handlers internos.
- ``X-Request-ID`` en la respuesta para que el cliente lo propague.
- contextvars de structlog para que cualquier ``logger.info(...)`` durante el
  ciclo de vida de la petición emita el campo ``correlation_id``.

También deja un log estructurado por cada request con método, ruta, status y
duración en milisegundos.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger

_HEADER = "X-Request-ID"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Asigna correlation_id y registra cada request con duración."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        correlation_id = request.headers.get(_HEADER) or uuid4().hex
        request.state.correlation_id = correlation_id

        # Bind por request: limpia state previo y une el id al contexto.
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
        )

        logger = get_logger("atlas.request")
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception("request.error", duration_ms=round(duration_ms, 2))
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "request.completed",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )

        response.headers[_HEADER] = correlation_id
        return response
