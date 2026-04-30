"""Rate limiting configuration using slowapi.

Limita peticiones por IP en endpoints sensibles (auth) para mitigar fuerza bruta
y spam de registros. Se desactiva en tests vía settings.rate_limit_enabled=False.
"""
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from app.core.config import get_settings

_settings = get_settings()


def _key_func(request: Request) -> str:
    """IP del cliente; respeta cabeceras de proxy en producción."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Primer IP de la cadena = cliente original.
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_key_func,
    enabled=_settings.rate_limit_enabled,
    default_limits=[],
)


async def rate_limit_exceeded_handler(
    _request: Request, exc: Exception
) -> Response:
    """Devuelve 429 con detalle estándar cuando se excede el límite."""
    detail = str(exc) if isinstance(exc, RateLimitExceeded) else "Too Many Requests"
    return JSONResponse(status_code=429, content={"detail": f"Rate limit exceeded: {detail}"})


__all__ = ["limiter", "rate_limit_exceeded_handler", "RateLimitExceeded"]

# Re-export type for FastAPI exception handler registration.
ExceptionHandler = Callable[[Request, Exception], Awaitable[Response]]
