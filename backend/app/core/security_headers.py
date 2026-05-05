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

from typing import Any

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

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

_PERMISSIONS_POLICY = (
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
    "magnetometer=(), microphone=(), payment=(), usb=()"
)


class SecurityHeadersMiddleware:
    """Middleware ASGI puro que inyecta cabeceras de seguridad.

    Implementado como middleware ASGI puro (no BaseHTTPMiddleware) para
    interceptar el mensaje ``http.response.start`` antes de que los headers
    salgan al cliente. Esto garantiza que nuestra CSP siempre se aplica,
    incluso en rutas servidas por sub-aplicaciones montadas (p.ej. /docs).
    """

    def __init__(self, app: ASGIApp, *, hsts: bool = False) -> None:
        self.app = app
        self._hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        csp = _DOCS_CSP if any(path.startswith(p) for p in _DOCS_PATHS) else _API_CSP
        hsts = self._hsts

        async def send_with_security_headers(message: Any) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("X-Content-Type-Options", "nosniff")
                headers.setdefault("X-Frame-Options", "DENY")
                headers.setdefault("Referrer-Policy", "no-referrer")
                headers.setdefault("Permissions-Policy", _PERMISSIONS_POLICY)
                # Siempre sobreescribimos CSP: nuestra política gana sobre
                # cualquier header que la app haya puesto previamente.
                headers["Content-Security-Policy"] = csp
                if hsts:
                    headers.setdefault(
                        "Strict-Transport-Security",
                        "max-age=63072000; includeSubDomains; preload",
                    )
            await send(message)

        await self.app(scope, receive, send_with_security_headers)
