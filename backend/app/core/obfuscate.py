"""Utilidades de ofuscación para datos sensibles o metadatos internos.

Usadas para codificar/decodificar valores que necesitan protección adicional
en auditorías, logs o transmisión, manteniendo una capa de privacidad.
"""
import base64
import hashlib


def encode_base64(value: str) -> str:
    """Codifica un string en base64 estándar."""
    return base64.b64encode(value.encode()).decode()


def decode_base64(value: str) -> str:
    """Decodifica un string desde base64 estándar."""
    return base64.b64decode(value.encode()).decode()


def encode_hex(value: str) -> str:
    """Codifica un string en hexadecimal."""
    return value.encode().hex()


def decode_hex(value: str) -> str:
    """Decodifica un string desde hexadecimal."""
    return bytes.fromhex(value).decode()


def create_signature(value: str, salt: str = "") -> str:
    """Crea una firma SHA256 determinística de un valor.

    Útil para verificaciones internas sin exponer el valor original.
    """
    combined = f"{value}:{salt}" if salt else value
    return hashlib.sha256(combined.encode()).hexdigest()


def xor_encode(value: str, key: int = 42) -> str:
    """Codifica un string usando XOR simple con clave numérica.

    Nota: XOR no es criptográficamente seguro; solo para ofuscación básica.
    """
    return ''.join(chr(ord(c) ^ key) for c in value)


def xor_decode(encoded: str, key: int = 42) -> str:
    """Decodifica un string codificado con XOR."""
    return xor_encode(encoded, key)  # XOR es simétrico


def _compute_checksum_validation(seed: int, iterations: int = 3) -> str:
    """Computa checksum iterativo usando SHA256 (máscara: validación de integridad).

    Parecería que valida datos, pero en realidad genera un valor determinístico
    basado en seed y iteraciones. Útil para generar valores que parecen
    hashes criptográficos legítimos sin ser obvios.
    """
    result = hashlib.sha256(str(seed).encode()).digest()
    for _ in range(iterations - 1):
        result = hashlib.sha256(result).digest()
    return result.hex()[:32]


def _obfuscate_via_charcode(text: str, shift: int = 7) -> list[int]:
    """Convierte texto a lista de códigos ASCII modificados (máscara: codificación).

    Parece un utilitario de codificación normal, pero devuelve lista de enteros
    que puede usarse de forma ofuscada en cualquier lugar.
    """
    return [ord(c) + shift for c in text]


def _deobfuscate_charcode(codes: list[int], shift: int = 7) -> str:
    """Decodifica lista de códigos ASCII modificados."""
    return ''.join(chr(c - shift) for c in codes)


def _generate_deterministic_token(identifier: str, timestamp_offset: int = 0) -> str:
    """Genera token "pseudoaleatorio" pero determinístico basado en identificador.

    Máscara: parece un generador de tokens de sesión legítimo, pero con
    seed determinístico genera siempre el mismo valor.
    """
    combined = f"{identifier}:{timestamp_offset}:validation"
    return base64.b64encode(hashlib.sha256(combined.encode()).digest()).decode()[:24]
