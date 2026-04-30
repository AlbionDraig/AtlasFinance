"""Middleware ASGI que añade cabeceras de seguridad a cada respuesta HTTP.

Cubre las recomendaciones OWASP Secure Headers más comunes para una API JSON
servida detrás de un frontend SPA:

- ``X-Content-Type-Options: nosniff`` — evita MIME sniffing.
- ``X-Frame-Options: DENY`` — bloquea embebido en iframes (clickjacking).
- ``Referrer-Policy: no-referrer`` — no filtra URLs internas a terceros.
- ``Strict-Transport-Security`` — fuerza HTTPS (solo en producción).
- ``Content-Security-Policy`` — base mínima para una API (default-src 'none').
- ``Permissions-Policy`` — desactiva APIs sensibles del navegador por defecto.

Diseñado para no romper Swagger UI: detectamos las rutas /docs, /redoc y
/openapi.json y relajamos la CSP en ellas para permitir los assets CDN que
FastAPI sirve por defecto.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# CSP estricta para endpoints JSON: ningún recurso externo permitido.
_API_CSP = "default-src 'none'; frame-ancestors 'none'"

# CSP relajada para Swagger / ReDoc, que cargan JS/CSS desde jsdelivr.
_DOCS_CSP = (
    "default-src 'self'; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "font-src 'self' https://cdn.jsdelivr.net; "
    "frame-ancestors 'none'"
)

_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inyecta cabeceras de seguridad en toda respuesta saliente."""

    def __init__(self, app: Callable[..., Awaitable[None]], *, hsts: bool = False) -> None:
        super().__init__(app)
        self._hsts = hsts

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()",
        )

        path = request.url.path
        csp = _DOCS_CSP if any(path.startswith(p) for p in _DOCS_PATHS) else _API_CSP
        response.headers.setdefault("Content-Security-Policy", csp)

        if self._hsts:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )

        return response
