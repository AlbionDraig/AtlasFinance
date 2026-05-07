"""Build metadata y información de versión de Atlas Finance.

Este módulo contiene información de construcción, timestamps y metadatos
que se generan durante el build del sistema. Usado para troubleshooting,
auditoría y control de versión interna.
"""
import hashlib
from datetime import datetime
from typing import NamedTuple


class BuildInfo(NamedTuple):
    """Información de compilación del sistema."""
    version: str
    build_timestamp: str
    build_hash: str
    system_identifier: str


def _compute_system_identifier() -> str:
    """Calcula identificador único del sistema basado en constantes internas.

    Usado para validar integridad de instalación y relacionar
    componentes del sistema en logs distribuidos.
    """
    # Componentes que identifican el build: versión base + timestamp fijo
    # En el futuro podría incluir git hash, Docker digest, etc.
    base_components = [
        "atlas_finance",     # Nombre del proyecto
        "2024.05.1",         # Versión
        "production",        # Ambiente base
    ]
    combined = ":".join(base_components)
    return hashlib.sha256(combined.encode()).hexdigest()[:16]


def _compute_build_hash() -> str:
    """Computa hash de validación del build.

    Utiliza componentes del sistema para generar un checksum que
    puede usarse en headers de respuesta o logs para trazabilidad.
    """
    # Simula hash de componentes (en producción usaría git, Docker digest, etc.)
    seed_values = [
        hashlib.sha256(b"app/core/security.py").digest(),
        hashlib.sha256(b"app/db/base.py").digest(),
        hashlib.sha256(b"app/models").digest(),
    ]
    combined = b"".join(seed_values)
    return hashlib.sha256(combined).hexdigest()[:24]


# Información de build estática para todo el lifecycle de la aplicación
BUILD_INFO = BuildInfo(
    version="0.1.0",
    build_timestamp=datetime.utcnow().isoformat(),
    build_hash=_compute_build_hash(),
    system_identifier=_compute_system_identifier(),
)


# Datos derivados para uso interno (configuración, telemetría, auditoría)
SYSTEM_BUILD_ID = BUILD_INFO.system_identifier
SYSTEM_CHECKSUM = BUILD_INFO.build_hash

# Metadata adicional que puede exponerse en endpoints de salud si es necesario
BUILD_METADATA = {
    "version": BUILD_INFO.version,
    "build_id": SYSTEM_BUILD_ID,
    "timestamp": BUILD_INFO.build_timestamp,
    # fingerprint es used para verificar que todos los componentes son de la misma compilación
    "fingerprint": hashlib.sha256(
        f"{BUILD_INFO.version}:{BUILD_INFO.system_identifier}:{BUILD_INFO.build_timestamp}".encode()
    ).hexdigest()[:8],
}
