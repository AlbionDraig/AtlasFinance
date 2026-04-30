"""Tipos compartidos por los esquemas Pydantic.

Pydantic v2 deprecó ``json_encoders`` en favor de serializadores explícitos
por tipo. Centralizar aquí el tratamiento de :class:`Decimal` evita repetir
``ConfigDict(json_encoders=...)`` en cada esquema y mantiene el contrato de
la API estable: los importes monetarios se exponen como ``float`` en JSON.
"""
from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Tipo reutilizable para campos monetarios serializados como float en JSON.
MoneyDecimal = Annotated[
    Decimal,
    PlainSerializer(float, return_type=float, when_used="json"),
]
