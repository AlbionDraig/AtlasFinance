"""Configuración centralizada de logging estructurado con structlog.

Decisiones:

- Salida JSON en producción (parseable por Loki / Datadog / CloudWatch).
- Salida humana coloreada en desarrollo y tests.
- Procesador `merge_contextvars` para que el correlation_id viva en un
  contextvar que el middleware HTTP inyecta por petición.
- Reemplaza la configuración de ``logging`` estándar para que las librerías
  (uvicorn, sqlalchemy) emitan también vía structlog y compartan el mismo
  formato y correlation_id.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog
from structlog.contextvars import merge_contextvars

from app.core.config import get_settings


def configure_logging() -> None:
    """Configura ``structlog`` y ``logging`` con un pipeline coherente."""
    settings = get_settings()
    is_production = settings.environment == "production"

    shared_processors: list[Any] = [
        merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]

    if is_production:
        renderer: Any = structlog.processors.JSONRenderer()
        shared_processors.append(structlog.processors.format_exc_info)
    else:
        # ConsoleRenderer formatea excepciones por sí solo; format_exc_info
        # romperia el bonito stacktrace coloreado.
        renderer = structlog.dev.ConsoleRenderer(colors=False)

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Reconfiguramos el root logger para que uvicorn/sqlalchemy compartan
    # el mismo formato cuando emiten vía logging estándar.
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=renderer,
            foreign_pre_chain=shared_processors,
        )
    )

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)

    # Silenciamos ruido de uvicorn.access (ya tenemos middleware propio).
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Helper tipado para obtener un logger estructurado."""
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)
    return logger
